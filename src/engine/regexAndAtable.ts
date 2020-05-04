import {DiffAndAtables} from './diffAndAtables';
import Box from './box';
import {canMoveTo} from '../imap/boxFeatures';
import Predictor from './predictor';
import MIN_SEGMENT_LENGTHS from './segmentLengths';
import Mistake from '../types/mistake';

interface DiffAndAtablesInstance {
  daa: DiffAndAtables;
  minSegmentLength: number;
}

interface TablesMap {
  [key: string]: ReadonlyArray<DiffAndAtablesInstance>;
}

export default class RegexAndAtable implements Predictor {
  private readonly boxesToInstancesMap: TablesMap;

  constructor() {
    this.boxesToInstancesMap = {};
  }

  addHeaders = (headers: string, qualifiedBoxName: string): void => {
    this.boxesToInstancesMap[qualifiedBoxName] = this.forEachInstanceOf(
      qualifiedBoxName,
      instance => DiffAndAtables.addStrings(instance.daa, [headers], instance.minSegmentLength)
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  addMistake(_mistake: Mistake): void {}

  considerBox = (box: Box): void => {
    this.boxesToInstancesMap[box.qualifiedName] = MIN_SEGMENT_LENGTHS.map(minSegmentLength => ({
      daa: DiffAndAtables.fromStrings(
        box.messages.map(message => message.headers as string),
        minSegmentLength
      ),
      minSegmentLength
    }));
  };

  folderScore = (headers: string): Map<string, number> => {
    return new Map(
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
  };

  private forEachInstanceOf = (
    qualifiedBoxName: string,
    fn: (instance: DiffAndAtablesInstance) => DiffAndAtables
  ): ReadonlyArray<DiffAndAtablesInstance> => {
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
}
