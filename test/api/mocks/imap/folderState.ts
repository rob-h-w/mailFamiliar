import {Box} from 'imap';

import Folder from './folder';
import MockMessage from './mockMessage';

type FolderState = {
  box: Omit<Box, 'name'>;
  messages: MockMessage[];
} & Folder;

export default FolderState;
