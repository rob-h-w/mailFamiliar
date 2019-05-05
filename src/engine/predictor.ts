import {Map} from 'immutable';

import Box from './box';

export default interface IPredictor {
  addHeaders(header: string, qualifiedBoxName: string): void;
  considerBox(box: Box): void;
  folderScore(headers: string): Map<string, number>;
  name(): string;
  removeHeaders(headers: string, qualifiedBoxName: string): void;
}
