import {DiffAndAtables} from './diffAndAtables';
import Box from './box';
import {canMoveTo} from '../imap/boxFeatures';
import User from 'persistence/user';
import IPredictor from './predictor';
import IJsonObject from '../types/json';

const MIN_SEGMENT_LENGTH = 10;

interface ITablesMap {
  [key: string]: DiffAndAtables;
}

export default class RegexAndAtable implements IPredictor {
  private readonly tablesMap: ITablesMap;
  private readonly user: User;

  constructor(user: User) {
    this.tablesMap = {};
    this.user = user;
  }

  addHeaders = (headers: string, qualifiedBoxName: string): void => {
    this.tablesMap[qualifiedBoxName] = DiffAndAtables.addHeadersList(
      this.tablesMap[qualifiedBoxName],
      [headers],
      MIN_SEGMENT_LENGTH
    );
  };

  considerBox = (box: Box): void => {
    this.tablesMap[box.qualifiedName] = DiffAndAtables.fromHeaders(
      box.messages.map(message => message.engineState[this.name()].headers as string),
      MIN_SEGMENT_LENGTH
    );
  };

  folderFor = (headers: string): string | null => {
    let bestMatch: string | null = null;
    let threshold = this.user.moveThreshold;

    for (const qualifiedName of Object.keys(this.tablesMap).filter(name => canMoveTo(name))) {
      const confidence = DiffAndAtables.confidenceFor(this.tablesMap[qualifiedName], headers);

      if (confidence > threshold) {
        bestMatch = qualifiedName;
        threshold = confidence;
      }
    }

    return bestMatch;
  };

  name = (): string => 'regex';

  removeHeaders = (headers: string, qualifiedBoxName: string): void => {
    this.tablesMap[qualifiedBoxName] = DiffAndAtables.removeHeadersList(
      this.tablesMap[qualifiedBoxName],
      [headers],
      MIN_SEGMENT_LENGTH
    );
  };

  stateFromHeaders = (headers: string): IJsonObject => {
    return {
      headers
    };
  };
}
