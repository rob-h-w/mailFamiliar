import Box from '../engine/box';
import Move from '../types/move';
import User from './user';

export interface InitializablePersistence<InitParams> extends Persistence {
  init(parameters: InitParams): Promise<void>;
}

export type PredictorId = string;

export default interface Persistence {
  createUser(user: User): Promise<void>;
  listUsers(): Promise<Array<User>>;

  createBox(user: User, box: Box): Promise<void>;
  deleteBox(user: User, box: Box): Promise<void>;
  listBoxes(user: User): Promise<Array<Box>>;
  updateBox(user: User, box: Box): Promise<void>;

  listMoves(user: User): Promise<Move[]>;
  recordMoves(user: User, moves: ReadonlyArray<Move>): Promise<void>;

  getPredictorId(user: User, name: () => string): Promise<PredictorId>;

  predictorFolderContains(predictorId: PredictorId, predictorFolderName: string): Promise<boolean>;
}
