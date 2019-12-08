import {Folder as IFolder} from 'imap';

type Folder = {[key in keyof IFolder]: IFolder[key] | null};
export default Folder;
