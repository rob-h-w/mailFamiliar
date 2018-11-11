import Box from '../imap/box';
import User from './user';

export default interface IPersistence {
  init(parameters): Promise<void>;

  createUser(user: User): Promise<void>;
  listUsers(): Promise<Array<User> >;

  createBox(user: User, box: Box): Promise<void>;
  deleteBox(user: User, box: Box): Promise<void>;
  listBoxes(user: User): Promise<Array<Box> >;
};