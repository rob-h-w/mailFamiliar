import Box from './box';
import Imap from './imap';
import { ImapBox, ImapBoxList } from './imapBox';
import IPersistence from '../persistence/persistence';

function collectMailboxes(delimiter: string, parent: Box, boxRoot: ImapBoxList, boxList: Array<Box>) {
  Object.keys(boxRoot).forEach((name: string) => {
    const boxObject: ImapBox = boxRoot[name];
    const nextDelimiter: string = boxObject.delimiter || '/';
    const root: string = parent ? parent.qualifiedName : '';
    const qualifiedName: string = `${root}${delimiter}${name}`;
    const box: Box = new Box({
      attribs: boxObject.attribs,
      delimiter: nextDelimiter,
      name,
      parent,
      qualifiedName,
      syncedTo: 0
    });

    boxList.push(box);

    if (boxObject.children) {
      collectMailboxes(box.delimiter, box, boxObject.children, boxList);
    }
  });
}

export default class UserConnection {
  private readonly mailBoxes: Array<Box>;
  private readonly persistence: IPersistence;

  public readonly imap: Imap;

  public static async create(imap: Imap, persistence: IPersistence): Promise<UserConnection> {
    const persistedBoxes: Box[] = (await persistence.listBoxes(imap.user)) || [];
    const instance = new UserConnection(imap, persistence);
    await instance.init(persistedBoxes);
    return instance;
  }

  private constructor(imap: Imap, persistence: IPersistence) {
    this.imap = imap;
    this.mailBoxes = [];
    this.persistence = persistence;
  }

  get boxes(): Array<Box> {
    return this.mailBoxes;
  }

  private async init(persistedBoxes: Array<Box>) {

    const discoveredBoxes: Array<Box> = [];

    collectMailboxes(this.imap.delimiter, null, this.imap.mailBoxes, discoveredBoxes);

    for (let i: number = persistedBoxes.length - 1; i > -1; i--) {
      const persistedBox = persistedBoxes[i];

      for (let j: number = discoveredBoxes.length - 1; j > -1; j--) {
        const discoveredBox = discoveredBoxes[j];

        if (persistedBox.qualifiedName === discoveredBox.qualifiedName) {
          discoveredBox.mergeFrom(persistedBox);
          persistedBoxes.splice(i, 1);
          discoveredBoxes.splice(j, 1);
          this.mailBoxes.push(discoveredBox);
        }
      }
    }

    // discoveredBoxes were not persisted already.
    for (let i: number = 0; i < discoveredBoxes.length; i++) {
      const discoveredBox = discoveredBoxes[i];
      await this.persistence.createBox(this.imap.user, discoveredBox);
      this.mailBoxes.push(discoveredBox);
    };

    // persistedBoxes were persisted before but have now been deleted online.
    for (let i: number = 0; i < persistedBoxes.length; i++) {
      const persistedBox = persistedBoxes[i];
      await this.persistence.deleteBox(this.imap.user, persistedBox);
    };
  }
};
