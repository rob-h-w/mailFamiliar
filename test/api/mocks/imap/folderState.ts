import Folder from './folder';
import MockMessage from './mockMessage';

interface MessageState {
  new: number;
  total: number;
  unseen: number;
}

type FolderState = {
  messageState: MessageState;
  messages: MockMessage[];
} & Folder;

export default FolderState;
