import {DiffAndAtables} from './diffAndAtables';
import Box from './box';
import {canMoveTo} from '../imap/boxFeatures';
import IPredictor from './predictor';
import IJsonObject from '../types/json';

const MIN_SEGMENT_LENGTHS: ReadonlyArray<number> = [5, 6, 7, 8, 9, 10, 11, 13, 17, 19, 23, 29, 31];

interface IDiffAndAtablesInstance {
  daa: DiffAndAtables;
  minSegmentLength: number;
}

interface ITablesMap {
  [key: string]: ReadonlyArray<IDiffAndAtablesInstance>;
}

export default class RegexAndAtable implements IPredictor {
  private readonly boxesToInstancesMap: ITablesMap;

  constructor() {
    this.boxesToInstancesMap = {};
  }

  addHeaders = (headers: string, qualifiedBoxName: string): void => {
    this.boxesToInstancesMap[qualifiedBoxName] = this.forEachInstanceOf(
      qualifiedBoxName,
      instance => DiffAndAtables.addStrings(instance.daa, [headers], instance.minSegmentLength)
    );
  };

  considerBox = (box: Box): void => {
    this.boxesToInstancesMap[box.qualifiedName] = MIN_SEGMENT_LENGTHS.map(minSegmentLength => ({
      daa: DiffAndAtables.fromStrings(
        box.messages.map(message => message.engineState[this.name()].headers as string),
        minSegmentLength
      ),
      minSegmentLength
    }));
  };

  folderScore = (headers: string): Map<string, number> => {
    const scores = new Map<string, number>(
      Object.keys(this.boxesToInstancesMap)
        .filter(name => canMoveTo(name))
        .map(
          key =>
            [
              key,
              this.boxesToInstancesMap[key]
                .map(instance => DiffAndAtables.confidenceFor(instance.daa, headers))
                .reduce((total, next) => total + next, 0) / this.boxesToInstancesMap[key].length
            ] as [string, number]
        )
    );
    return scores;
  };

  private forEachInstanceOf = (
    qualifiedBoxName: string,
    fn: (instance: IDiffAndAtablesInstance) => DiffAndAtables
  ): ReadonlyArray<IDiffAndAtablesInstance> => {
    const instances = this.boxesToInstancesMap[qualifiedBoxName];
    return instances.map(instance => ({
      daa: fn(instance),
      minSegmentLength: instance.minSegmentLength
    }));
  };

  name = (): string => 'regex';

  removeHeaders = (headers: string, qualifiedBoxName: string): void => {
    this.boxesToInstancesMap[qualifiedBoxName] = this.forEachInstanceOf(
      qualifiedBoxName,
      instance => DiffAndAtables.removeStrings(instance.daa, [headers], instance.minSegmentLength)
    );
  };

  stateFromHeaders = (headers: string): IJsonObject => {
    return {
      headers
    };
  };
}
