import {Box} from 'imap';

import FolderState from './folderState';

interface FolderMap {
  [name: string]: FolderState;
}

export default interface ServerState {
  currentlyOpenBox: string | null;
  folders: FolderMap;
}

export function fromBoxes(boxen: ReadonlyArray<Box>): ServerState {
  const folders: FolderMap = {};
  (boxen as ReadonlyArray<Box>).forEach(box => {
    folders[box.name] = {
      attribs: [],
      children: {},
      delimiter: '/',
      messageState: {
        new: 0,
        total: 0,
        unseen: 0
      },
      messages: [],
      parent: null
    };
  });
  return {
    currentlyOpenBox: null,
    folders
  };
}
