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
  (boxen as ReadonlyArray<Box>).forEach((box) => {
    folders[box.name] = {
      attribs: [],
      box: {
        flags: ['\\Answered', '\\Flagged', '\\Deleted', '\\Seen', '\\Draft', 'NonJunk'],
        newKeywords: false,
        messages: {
          new: 0,
          total: 0,
          unseen: 0,
        },
        permFlags: ['\\Answered', '\\Flagged', '\\Deleted', '\\Seen', '\\Draft'],
        persistentUIDs: true,
        readOnly: false,
        uidnext: 123,
        uidvalidity: 456,
      },
      children: {},
      delimiter: '/',
      messages: [],
      parent: null,
    };
  });
  return {
    currentlyOpenBox: null,
    folders,
  };
}
