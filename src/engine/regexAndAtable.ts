import {Map as ImMap} from 'immutable';

import {DiffAndAtables} from './diffAndAtables';
import Box from './box';
import {canMoveTo} from '../imap/boxFeatures';
import IPredictor from './predictor';
import MIN_SEGMENT_LENGTHS from './segmentLengths';

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
        box.messages.map(message => message.headers as string),
        minSegmentLength
      ),
      minSegmentLength
    }));
  };

  folderScore = (headers: string): ImMap<string, number> => {
    return ImMap(
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
}
