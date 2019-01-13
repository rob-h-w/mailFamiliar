import * as _ from 'lodash';

import AdjacencyTable, {AdjacencyTableJson} from './adjacencyTable';
import Box from './box';
import User from '../persistence/user';
import IPredictor from './predictor';
import IJsonObject from '../types/json';
import {canMoveTo} from '../imap/boxFeatures';

interface IMap<T> {
  [key: string]: T;
}

export class NaiveATable implements IPredictor {
  private readonly allBoxesATable: AdjacencyTable;
  private readonly aTableMap: IMap<AdjacencyTable>;
  private readonly user: User;

  constructor(user: User) {
    this.allBoxesATable = new AdjacencyTable();
    this.aTableMap = {};
    this.user = user;
  }

  addHeaders = (headers: string, qualifiedBoxName: string) => {
    this.allBoxesATable.addString(headers);
    this.aTableFor(qualifiedBoxName).addString(headers);
  };

  private aTableFor = (qualifiedBoxName: string): AdjacencyTable => {
    const aTable = this.aTableMap[qualifiedBoxName];

    if (_.isUndefined(aTable)) {
      throw new Error(`Box ${qualifiedBoxName} is not known to the adjacency table predictor.`);
    }

    return aTable;
  };

  considerBox = (box: Box) => {
    const qualifiedName = box.qualifiedName;

    if (!_.isUndefined(this.aTableMap[qualifiedName])) {
      this.allBoxesATable.subtractAdjacencyTable(this.aTableMap[qualifiedName]);
    }

    const aTable = new AdjacencyTable();
    box.messages.forEach(msg => {
      const state = AdjacencyTableJson.validate(msg.engineState[this.name()]);
      if (state.success) {
        aTable.addAdjacencyTable(state.value);
      }
    });
    this.aTableMap[qualifiedName] = aTable;
    this.allBoxesATable.addAdjacencyTable(aTable);
  };

  folderFor = (headers: string): string | null => {
    let topBoxName: string | null = null;
    let topThreshold: number = this.user.moveThreshold;
    for (const qualifiedName of Object.keys(this.aTableMap).filter(name => canMoveTo(name))) {
      const aTable = this.aTableFor(qualifiedName);
      const aTableWithout = new AdjacencyTable(this.allBoxesATable);
      aTableWithout.subtractAdjacencyTable(aTable);
      const confidence = aTable.confidenceFor(headers) - aTableWithout.confidenceFor(headers);
      if (confidence > topThreshold) {
        topBoxName = qualifiedName;
        topThreshold = confidence;
      }
    }

    return topBoxName ? topBoxName : null;
  };

  name() {
    return 'adjacencyTable';
  }

  removeHeaders = (headers: string, qualifiedBoxName: string): void => {
    this.aTableFor(qualifiedBoxName).subtractString(headers);
  };

  stateFromHeaders = (headers: string): IJsonObject => {
    const aTable = new AdjacencyTable(headers);
    return aTable.raw;
  };
}
