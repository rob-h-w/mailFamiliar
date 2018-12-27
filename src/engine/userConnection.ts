import * as Imap from 'imap';
import * as _ from 'lodash';

import Box from './box';
import {canLearnFrom, canMoveTo} from '../imap/boxFeatures';
import Promisified, {IBoxListener} from '../imap/promisified';
import logger from '../logger';
import {IMessage, messageFromBody} from './message';
import IPersistence from '../persistence/persistence';
import User from '../persistence/user';
import IPredictor from './predictor';

/** TODO: split this class into an IMAP handler implementing IBoxListener & an engine implementing IPredictor passed to UserConnection. */
export default class UserConnection implements IBoxListener, IPredictor {
  private currentlyOpen?: Box;
  private inbox?: Box;
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

  private closeBox = async () => {
    if (this.currentlyOpen) {
      this.currentlyOpen = undefined;
      await this.pImap.closeBox();
    }

    this.currentlyOpen = undefined;
  };

  private collectMailboxes = (
    boxRoot: Imap.MailBoxes = {},
    delimiter?: string,
    parent?: Box
  ): Box[] => {
    let boxes: Box[] = [];
    const rootDelimiter = delimiter || parent ? this.pImap.imap.delimiter : '';

    for (const name of Object.keys(boxRoot)) {
      const folder: Imap.Folder = boxRoot[name];
      const root: string = parent
        ? `${parent.qualifiedName}${folder.delimiter || rootDelimiter}`
        : '';
      const qualifiedName: string = `${root}${name}`;
      const box: Box = new Box({
        adjacencyTable: {
          table: {},
          totalSampleLength: 0,
          totalSamples: 0
        },
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

  private fetch = (source: any, seq = false) => {
    const fetchObj = seq ? this.pImap.imap.seq : this.pImap.imap;
    return this.pImap.fetch(
      fetchObj.fetch(source, {
        bodies: 'HEADER',
        envelope: true,
        size: true
      })
    );
  };

  public folderFor = (message: IMessage): string | null => {
    let topBox: Box | null = null;
    let topThreshold: number = this.user.moveThreshold;
    for (const box of this.boxes.filter(box => canMoveTo(box.qualifiedName))) {
      const confidence = box.confidenceFor(message.headers);
      if (confidence > topThreshold) {
        topBox = box;
        topThreshold = confidence;
      }
    }

    return topBox ? topBox.qualifiedName : null;
  };

  private handleNewMail = async () => {
    if (this.currentlyOpen && this.currentlyOpen.isInbox) {
      const uids = await this.pImap.search([[`SINCE`, new Date(this.currentlyOpen.syncedTo)]]);
      if (_.isEmpty(uids)) {
        return;
      }

      const messageBodies = await this.fetch(uids);

      for (const messageBody of messageBodies) {
        const message = messageFromBody(messageBody);
        const recommendedBoxName = this.folderFor(message);

        if (recommendedBoxName && recommendedBoxName !== this.currentlyOpen.qualifiedName) {
          logger.warn(
            `Would move (${message.envelope.from[0].name} subject: ${
              message.envelope.subject
            }) to ${recommendedBoxName}`
          );
        } else {
          logger.info(
            `keeping (${message.envelope.from[0].name} subject: ${
              message.envelope.subject
            }) in the inbox.`
          );
        }

        this.currentlyOpen.addMessage(message);
      }

      await this.persistence.updateBox(this.user, this.currentlyOpen);
    }
  };

  private get inboxOpen() {
    return this.currentlyOpen && this.currentlyOpen.isInbox;
  }

  private async init(persistedBoxes: ReadonlyArray<Box>, pImap: Promisified) {
    this.pImap = pImap;
    const writablePersistedBoxes: Box[] = persistedBoxes.map(box => box);
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
          break;
        }
      }
    }

    // discoveredBoxes were not persisted already.
    for (const discoveredBox of discoveredBoxes) {
      await this.persistence.createBox(this.user, discoveredBox);
      resultingBoxes.push(discoveredBox);
    }

    // persistedBoxes were persisted before but have now been deleted online.
    for (const persistedBox of writablePersistedBoxes) {
      await this.persistence.deleteBox(this.user, persistedBox);
    }

    for (let i: number = resultingBoxes.length - 1; i > -1; i--) {
      const box = resultingBoxes[i];
      try {
        await box.subscribe();

        if (box.isInbox) {
          this.inbox = box;
        }
      } catch (e) {
        logger.error(e);
        resultingBoxes.splice(i, 1);
      }
    }

    this.mailBoxes = resultingBoxes;
    await this.openInbox();

    logger.info('init complete');
  }

  onClose = (hadError: boolean) => {
    logger.warn(`Connection for ${this.user.user} closed${hadError ? ' with error.' : '.'}`);
    // TODO: Re-create the entire setup.
  };

  onExpunge = async (seqNo: number) => {
    // We care if the user moves something from the inbox.
    if (this.inboxOpen) {
      await this.fetch([`${seqNo}:*`]);
      // TODO: Do something with the result.
    }
  };

  onMail = async (/*count: number*/) => {
    await this.handleNewMail();
  };

  private openBox = async (box: Box) => {
    await this.closeBox();
    await this.pImap.openBox(box.qualifiedName);
    this.currentlyOpen = box;
  };

  private openInbox = async () => {
    await this.closeBox();

    if (!this.inbox) {
      return;
    }

    await this.openBox(this.inbox);
  };

  shallowSync = async () => {
    const syncWindowMs = 24 * 60 * 60 * 1000 * this.user.syncWindowDays;
    const defaultStartDate = new Date(Date.now() - syncWindowMs);

    for (const box of this.boxes.filter(box => canLearnFrom(box.qualifiedName))) {
      if (box.isInbox) {
        continue;
      }

      const startDate = new Date(Math.max(defaultStartDate.getTime(), box.syncedTo));
      await this.openBox(box);
      const search = await this.pImap.search([['SINCE', startDate]]);
      if (search.length) {
        const messages = await this.fetch(search);

        for (const message of messages) {
          box.addMessage(messageFromBody(message));
        }

        await this.persistence.updateBox(this.user, box);
      }
    }

    await this.openInbox();
    await this.handleNewMail();

    logger.info(`shallow sync complete`);
  };
}
