import PersistenceModel from '../persistence/model';
import Persistence from '../persistence/persistence';
import User from '../persistence/user';
import Mistake from '../types/mistake';
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
  addHeaders(header: string, qualifiedBoxName: string): Promise<void>;
  addMistake(mistake: Mistake): Promise<void>;
  considerBox(box: Box): Promise<void>;
  folderScore(headers: string): Promise<Map<string, number>>;
  init(user: User, persistence: Persistence): Promise<void>;
  persistenceModel(): PersistenceModel | undefined;
  name(): string;
  removeBox(qualifiedBoxName: string): Promise<void>;
  removeHeaders(headers: string, qualifiedBoxName: string): Promise<void>;
}
