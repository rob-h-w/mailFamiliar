import Folder from './folder';
import MockMessage from './mockMessage';

type FolderState = {
  messages: MockMessage[];
} & Folder;

export default FolderState;
