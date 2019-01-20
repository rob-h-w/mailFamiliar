import {DiffAndAtables} from './diffAndAtables';
import Box from './box';
import {canMoveTo} from '../imap/boxFeatures';
import User from 'persistence/user';
import IPredictor from './predictor';
import IJsonObject from '../types/json';

const MIN_SEGMENT_LENGTHS: ReadonlyArray<number> = [5, 7, 11, 13, 17];

interface IDiffAndAtablesInstance {
  daa: DiffAndAtables;
  minSegmentLength: number;
}

interface ITablesMap {
  [key: string]: ReadonlyArray<IDiffAndAtablesInstance>;
}

export default class RegexAndAtable implements IPredictor {
  private readonly boxesToInstancesMap: ITablesMap;
  private readonly user: User;

  constructor(user: User) {
    this.boxesToInstancesMap = {};
    this.user = user;
  }

  addHeaders = (headers: string, qualifiedBoxName: string): void => {
    this.boxesToInstancesMap[qualifiedBoxName] = this.forEachInstanceOf(
      qualifiedBoxName,
      instance => DiffAndAtables.addHeadersList(instance.daa, [headers], instance.minSegmentLength)
    );
  };

  considerBox = (box: Box): void => {
    this.boxesToInstancesMap[box.qualifiedName] = MIN_SEGMENT_LENGTHS.map(minSegmentLength => ({
      daa: DiffAndAtables.fromHeaders(
        box.messages.map(message => message.engineState[this.name()].headers as string),
        minSegmentLength
      ),
      minSegmentLength
    }));
  };

  folderFor = (headers: string): string | null => {
    let bestMatch: string | null = null;
    let threshold = this.user.moveThreshold;

    for (const qualifiedName of Object.keys(this.boxesToInstancesMap).filter(name =>
      canMoveTo(name)
    )) {
      const instances = this.boxesToInstancesMap[qualifiedName];
      const confidence =
        instances
          .map(instance => DiffAndAtables.confidenceFor(instance.daa, headers))
          .reduce((total, next) => total + next, 0) / instances.length;

      if (confidence > threshold) {
        bestMatch = qualifiedName;
        threshold = confidence;
      }
    }

    return bestMatch;
  };

  private forEachInstanceOf = (
    qualifieBoxName: string,
    fn: (instance: IDiffAndAtablesInstance) => DiffAndAtables
  ): ReadonlyArray<IDiffAndAtablesInstance> => {
    const instances = this.boxesToInstancesMap[qualifieBoxName];
    return instances.map(instance => ({
      daa: fn(instance),
      minSegmentLength: instance.minSegmentLength
    }));
  };

  name = (): string => 'regex';

  removeHeaders = (headers: string, qualifiedBoxName: string): void => {
    this.boxesToInstancesMap[qualifiedBoxName] = this.forEachInstanceOf(
      qualifiedBoxName,
      instance =>
        DiffAndAtables.removeHeadersList(instance.daa, [headers], instance.minSegmentLength)
    );
  };

  stateFromHeaders = (headers: string): IJsonObject => {
    return {
      headers
    };
  };
}
