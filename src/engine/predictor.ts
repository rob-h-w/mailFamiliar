import {Map} from 'immutable';

import Box from './box';

export class UndeclaredBoxError extends Error {
  constructor(qualifiedBoxName: string) {
    super(
      `Attempted to interact with a box (${qualifiedBoxName}) that was not yet considered.` +
        '\nCall considerBox on this predictor before attempting to use the box.'
    );
  }
}

export default interface Predictor {
  addHeaders(header: string, qualifiedBoxName: string): void;
  considerBox(box: Box): void;
  folderScore(headers: string): Map<string, number>;
  name(): string;
  removeHeaders(headers: string, qualifiedBoxName: string): void;
}
