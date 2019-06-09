import FolderState from './folderState';

export default interface ServerState {
  folders: {
    [name: string]: FolderState;
  };
}
