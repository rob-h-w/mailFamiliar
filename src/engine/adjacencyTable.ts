import * as _ from 'lodash';

interface IMap {
  [s: string]: number;
}

export interface IAdjacencyTable {
  table: {[key: string]: number};
  totalSampleLength: number;
  totalSamples: number;
}

export default class AdjacencyTable {
  private readonly startTable: IMap = {};
  private readonly table: IMap = {};
  private tSampleLength = 0;
  private tSamples: number = 0;

  static readonly START = 'START';
  static readonly FINISH = 'FINISH';

  private static addToMap = (map: IMap, key: string, value: number) => {
    if (map[key]) {
      map[key] += value;
    } else {
      map[key] = value;
    }
  };

  private static firstChar = (key: string): string => {
    return AdjacencyTable.splitKey(key)[0];
  };

  private static splitKey = (key: string): [string, string] => {
    const keyArray = Array.from(key);
    if (keyArray.length === 2) {
      return [keyArray[0], keyArray[1]];
    }

    if (key.startsWith(AdjacencyTable.START)) {
      return [AdjacencyTable.START, keyArray[keyArray.length - 1]];
    }

    if (key.endsWith(AdjacencyTable.FINISH)) {
      return [keyArray[0], AdjacencyTable.FINISH];
    }

    throw new Error(`Cannot split key "${key}"`);
  };

  private static subtractFromMap = (map: IMap, key: string, value: number) => {
    if (!map[key]) {
      return;
    }

    map[key] -= value;
    if (map[key] <= 0) {
      delete map[key];
    }
  };

  constructor(source?: string | IAdjacencyTable) {
    if (_.isUndefined(source)) {
      return;
    } else if (_.isString(source)) {
      this.addString(source);
    } else {
      this.addAdjacencyTable(source);
    }
  }

  public addAdjacencyTable = (source?: IAdjacencyTable) => {
    if (!source) {
      return;
    }

    const table = source.table;
    for (const key of Object.keys(table)) {
      this.addAt(key, source.table[key]);
    }

    this.tSampleLength += source.totalSampleLength;
    this.tSamples += source.totalSamples;
  };

  private addAt = (key: string, value: number) => {
    AdjacencyTable.addToMap(this.table, key, value);
    AdjacencyTable.addToMap(this.startTable, AdjacencyTable.firstChar(key), value);
  };

  public addString = (source?: string) => {
    if (!source) {
      return;
    }

    let previous = AdjacencyTable.START;

    for (const char of Array.from(source)) {
      const key = `${previous}${char}`;
      this.incrementAt(key);
      previous = char;
    }

    this.incrementAt(`${previous}${AdjacencyTable.FINISH}`);
    this.tSampleLength += source.length;
    this.tSamples += 1;
  };

  public confidenceFor = (str: string) => {
    let cumulativeProbability = 0;
    let first = AdjacencyTable.START;
    const strArray = [...Array.from(str), AdjacencyTable.FINISH];

    for (const second of strArray) {
      cumulativeProbability += this.pAThenB(first, second);
      first = second;
    }

    return cumulativeProbability / strArray.length;
  };

  private decrementAt = (key: string) => {
    this.subtractAt(key, 1);
  };

  private incrementAt = (key: string) => {
    this.addAt(key, 1);
  };

  public pAThenB = (a: string, b: string): number => {
    const key = `${a}${b}`;
    const totalForAThenB = this.table[key];
    const totalForA = this.startTable[a];

    if (_.isUndefined(totalForAThenB)) {
      return 0;
    }

    return totalForAThenB / totalForA;
  };

  get raw(): IAdjacencyTable {
    return {
      table: JSON.parse(JSON.stringify(this.table)),
      totalSampleLength: this.tSampleLength,
      totalSamples: this.tSamples
    };
  }

  subtractAdjacencyTable = (source?: IAdjacencyTable) => {
    if (!source) {
      return;
    }

    const table = source.table;
    for (const key of Object.keys(table)) {
      this.subtractAt(key, source.table[key]);
    }

    this.tSampleLength -= source.totalSampleLength;
    this.tSamples -= source.totalSamples;
  };

  private subtractAt = (key: string, value: number) => {
    AdjacencyTable.subtractFromMap(this.table, key, value);
    AdjacencyTable.subtractFromMap(this.startTable, AdjacencyTable.firstChar(key), value);
  };

  subtractString = (source?: string) => {
    if (!source) {
      return;
    }

    let previous = AdjacencyTable.START;

    for (const char of source) {
      const key = `${previous}${char}`;
      this.decrementAt(key);
      previous = char;
    }

    this.decrementAt(`${previous}${AdjacencyTable.FINISH}`);
    this.tSampleLength -= source.length;
    this.tSamples -= 1;
  };
}
