import * as Imap from 'imap';

import Box from './box';
import Promisified, {IBoxListener} from '../imap/promisified';
import IPersistence from '../persistence/persistence';
import User from '../persistence/user';
import logger from '../logger';

export default class UserConnection implements IBoxListener {
  private currentlyOpen?: Box;
  private mailBoxes: ReadonlyArray<Box>;
  private readonly persistence: IPersistence;
  private pImap: Promisified;
  private readonly user: User;

  public static async create(user: User, persistence: IPersistence): Promise<UserConnection> {
    const persistedBoxes: ReadonlyArray<Box> = (await persistence.listBoxes(user)) || [];
    const instance = new UserConnection(persistence, user);
    const pImap = new Promisified(new Imap(user), instance);
    await pImap.waitForConnection();
    await instance.init(persistedBoxes, pImap);
    return instance;
  }

  private constructor(persistence: IPersistence, user: User) {
    this.persistence = persistence;
    this.user = user;
  }

  get boxes(): ReadonlyArray<Box> {
    return this.mailBoxes;
  }

  private collectMailboxes = (
    boxRoot: Imap.MailBoxes = {},
    delimiter?: string,
    parent?: Box
  ): Box[] => {
    let boxes: Box[] = [];
    const rootDelimiter = delimiter || parent ? this.pImap.imap.delimiter : '';

    for (const name of Object.keys(boxRoot)) {
      const folder: Imap.Folder = boxRoot[name];
      const root: string = parent ? parent.qualifiedName : '';
      const qualifiedName: string = `${root}${folder.delimiter || rootDelimiter}${name}`;
      const box: Box = new Box({
        imapFolder: folder,
        name,
        pImap: this.pImap,
        qualifiedName,
        syncedTo: 0
      });

      boxes.push(box);

      if (folder.children) {
        boxes = boxes.concat(this.collectMailboxes(folder.children, folder.delimiter, box));
      }
    }

    return boxes;
  };

  private get inboxOpen() {
    return this.currentlyOpen && this.currentlyOpen.isInbox;
  }

  private async init(persistedBoxes: ReadonlyArray<Box>, pImap: Promisified) {
    this.pImap = pImap;
    const writablePersistedBoxes: Box[] = JSON.parse(JSON.stringify(persistedBoxes));
    const mailBoxes = await this.pImap.getBoxes();
    const discoveredBoxes = this.collectMailboxes(mailBoxes);
    const resultingBoxes: Box[] = [];

    for (let i: number = writablePersistedBoxes.length - 1; i > -1; i--) {
      const persistedBox = writablePersistedBoxes[i];

      for (let j: number = discoveredBoxes.length - 1; j > -1; j--) {
        const discoveredBox = discoveredBoxes[j];

        if (persistedBox.qualifiedName === discoveredBox.qualifiedName) {
          discoveredBox.mergeFrom(persistedBox);
          writablePersistedBoxes.splice(i, 1);
          discoveredBoxes.splice(j, 1);
          resultingBoxes.push(discoveredBox);
        }
      }
    }

    // discoveredBoxes were not persisted already.
    for (const discoveredBox of discoveredBoxes) {
      await this.persistence.createBox(this.user, discoveredBox);
      resultingBoxes.push(discoveredBox);
    }

    // persistedBoxes were persisted before but have now been deleted online.
    for (const persistedBox of persistedBoxes) {
      await this.persistence.deleteBox(this.user, persistedBox);
    }

    for (let i: number = resultingBoxes.length - 1; i > -1; i--) {
      const box = resultingBoxes[i];
      try {
        await box.subscribe();

        if (box.isInbox) {
          await this.openBox(box);
        }
      } catch (e) {
        logger.error(e);
        resultingBoxes.splice(i, 1);
      }
    }

    this.mailBoxes = resultingBoxes;
  }

  onClose = (/*hadError: boolean*/) => {
    // TODO: Re-create the entire setup.
  };

  onExpunge = (seqNo: number) => {
    // We care if the user moves something from the inbox.
    if (this.inboxOpen) {
      const fetch = this.pImap.imap.seq.fetch(seqNo, {
        bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
        struct: true
      });

      this.pImap.fetch(fetch);
    }
  };

  onMail = (/*count: number*/) => {
    if (this.currentlyOpen && this.currentlyOpen.isInbox) {
      // TOOD: fetch the new messages if it's the inbox.
    }
  };

  private openBox = async (box: Box) => {
    if (this.currentlyOpen) {
      this.currentlyOpen = undefined;
      await this.pImap.closeBox();
    }

    await this.pImap.openBox(box.qualifiedName);
    this.currentlyOpen = box;
  };

  shallowSync = () => {};
}
