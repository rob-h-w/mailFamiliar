import Box from '../engine/box';
import User from './user';

export interface IInitializablePersistence<InitParams> extends IPersistence {
  init(parameters: InitParams): Promise<void>;
}

export default interface IPersistence {
  createUser(user: User): Promise<void>;
  listUsers(): Promise<Array<User>>;

  createBox(user: User, box: Box): Promise<void>;
  deleteBox(user: User, box: Box): Promise<void>;
  listBoxes(user: User): Promise<Array<Box>>;
  updateBox(user: User, box: Box): Promise<void>;
}
