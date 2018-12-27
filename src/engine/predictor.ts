import {IMessage} from './message';

export default interface IPredictor {
  folderFor(message: IMessage): string | null;
}
