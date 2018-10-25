import Box from '../engine/box';
import Imap from '../imap/imap';

export default class UserConnection {
  private persistedBoxes: Array<Box>;
  public readonly imap: Imap;

  constructor(imap: Imap, persistedBoxes?: Array<Box>) {
    this.imap = imap;
    this.persistedBoxes = persistedBoxes || [];
  }

  get boxes(): Array<Box> {
    return this.persistedBoxes;
  }
};
