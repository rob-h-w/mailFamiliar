import * as Imap from 'imap';
import {Map} from 'immutable';
import * as _ from 'lodash';

import Box from './box';
import {canLearnFrom} from '../imap/boxFeatures';
import {OnDisconnect} from '../imap/functions';
import Promisified, {IBoxListener} from '../imap/promisified';
import logger from '../logger';
import {messageFromBody} from './message';
import IPersistence from '../persistence/persistence';
import User from '../persistence/user';
import IPredictor from './predictor';
import {getSyncedTo, withTrialSettings} from '../tools/trialSettings';
import NewMailHandler from './newMailHandler';
import {create as createPredictors, PredictorType} from './predictors';

export default class UserConnection implements IBoxListener {
  private attempts: number;
  private currentlyOpen?: Box;
  private disconnectCallback?: OnDisconnect;
  private inbox?: Box;
  private mailBoxes: ReadonlyArray<Box>;
  private newMailHander: NewMailHandler;
  private readonly persistenceReference: IPersistence;
  private readonly pImap: Promisified;
  private readonly predictors: Map<PredictorType, IPredictor>;
  private readonly currentPredictor: IPredictor;
  private refreshTimer: NodeJS.Timer;
  private readonly userReference: User;

  private static refresh(uc: UserConnection) {
    if (uc.refreshTimer) {
      clearTimeout(uc.refreshTimer);
    }

    uc.refreshTimer = setTimeout(
      UserConnection.refresh,
      uc.user.refreshPeriodMinutes * 60 * 1000,
      uc
    );

    return uc.shallowSync();
  }

  public constructor(persistence: IPersistence, u: User, connectionAttempts: number) {
    const user = withTrialSettings(u);
    this.attempts = connectionAttempts;
    this.persistenceReference = persistence;
    this.pImap = new Promisified(new Imap(user), this);
    this.predictors = createPredictors();
    this.currentPredictor = this.predictors.get(u.predictorType || 'RegexAndAtable') as IPredictor;
    this.userReference = user;
  }

  get boxes(): ReadonlyArray<Box> {
    return this.mailBoxes;
  }

  private closeBox = async () => {
    if (this.currentlyOpen) {
      try {
        await this.pImap.closeBox();
      } finally {
        this.currentlyOpen = undefined;
      }
    } else {
      this.currentlyOpen = undefined;
    }
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

  get connectionAttempts() {
    return this.attempts;
  }

  defaultStartDate = () => new Date(Date.now() - 24 * 60 * 60 * 1000 * this.user.syncWindowDays);

  fetch = (source: any, seq = false) => {
    const fetchObj = seq ? this.pImap.imap.seq : this.pImap.imap;
    return this.pImap.fetch(
      fetchObj.fetch(source, {
        bodies: 'HEADER',
        envelope: true,
        size: true
      })
    );
  };

  private handleNewMail = async () => {
    if (this.currentlyOpen && this.currentlyOpen.isInbox) {
      this.newMailHander.handleMail(this.currentlyOpen);
    }
  };

  public async init() {
    const persistedBoxes: ReadonlyArray<Box> = (await this.persistence.listBoxes(this.user)) || [];
    await this.pImap.waitForConnection(() => {
      if (this.disconnectCallback) {
        this.disconnectCallback();
      }
    });
    this.newMailHander = new NewMailHandler(this, this.pImap);
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
    this.attempts = 0;
    await UserConnection.refresh(this);

    logger.info('init complete');
  }

  onClose = (hadError: boolean) => {
    logger.warn(`Connection for ${this.user.user} closed${hadError ? ' with error.' : '.'}`);
    if (this.onDisconnect) {
      this.onDisconnect();
    }
  };

  get onDisconnect() {
    return this.disconnectCallback;
  }

  set onDisconnect(callback: OnDisconnect | undefined) {
    this.disconnectCallback = callback;
  }

  onExpunge = async (seqNo: number) => {
    if (!this.currentlyOpen) {
      // Shouldn't be possible - log it & move on.
      logger.warn(
        `Sequence number ${seqNo} was expunged when no box was open. This shouldn't ever happen.`
      );
      return;
    }

    const expungedMessage = this.currentlyOpen.messages.find(message => message.seq === seqNo);

    if (!expungedMessage) {
      // We never knew about the expunged message. All good.
      return;
    }

    this.currentlyOpen.removeMessage(expungedMessage);
    this.currentPredictor.considerBox(this.currentlyOpen);

    // Trigger check of all other boxen in case the message moved there.
    await this.shallowSyncSince(expungedMessage.date, [this.currentlyOpen.qualifiedName], true);
  };

  onMail = async (/*count: number*/) => {
    await this.handleNewMail();
  };

  onUidValidity = async (uidValidity: number) => {
    const box = this.currentlyOpen;
    if (box && _.get(box, 'uidValidity') !== uidValidity) {
      // regenerate the entire box.
      await this.resetBox();
    }
  };

  private openBox = async (box: Box) => {
    await this.closeBox();
    let resetBox = false;

    try {
      this.currentlyOpen = box;

      switch (await box.open()) {
        case 'NEW':
          await this.persistence.updateBox(this.user, box);
          break;
        case 'UIDS_INVALID':
          resetBox = true;
          break;
      }
    } catch (e) {
      this.currentlyOpen = undefined;
      throw e;
    }

    if (resetBox) {
      await this.resetBox();
    }
  };

  private openInbox = async () => {
    await this.closeBox();

    if (!this.inbox) {
      return;
    }

    await this.openBox(this.inbox);
  };

  private populateBox = async (startDate?: Date) => {
    if (!this.currentlyOpen) {
      return;
    }

    if (_.isUndefined(startDate) || this.user.trial) {
      startDate = new Date(
        Math.max(this.defaultStartDate().getTime(), getSyncedTo(this.currentlyOpen))
      );
    }

    const search = await this.pImap.search([['SINCE', startDate]]);
    if (search.length) {
      const messages = await this.fetch(search);

      for (const messageBody of messages) {
        const message = messageFromBody(messageBody);
        this.currentlyOpen.addMessage(message);
      }
    }

    await this.persistence.updateBox(this.user, this.currentlyOpen);

    // Update box may have the consequence of making this.currentlyOpen undefined.
    if (this.currentlyOpen) {
      this.currentPredictor.considerBox(this.currentlyOpen);
    }
  };

  get persistence(): IPersistence {
    return this.persistenceReference;
  }

  get predictor(): IPredictor {
    return this.currentPredictor;
  }

  private resetBox = async () => {
    if (!this.currentlyOpen) {
      return;
    }

    this.currentlyOpen.reset();
    await this.populateBox();
  };

  private shallowSync = async () => {
    await this.shallowSyncSince(this.defaultStartDate());

    logger.info(`shallow sync complete`);
  };

  private shallowSyncSince = async (
    date: Date,
    excluding: string[] = [],
    resetSyncedTo: boolean = false
  ) => {
    for (const box of this.boxes
      .filter(box => canLearnFrom(box.qualifiedName))
      .filter(box => excluding.indexOf(box.qualifiedName) === -1)) {
      if (box.isInbox) {
        continue;
      }

      if (resetSyncedTo) {
        box.syncedTo = date.getTime();
      }

      const startDate = new Date(Math.max(date.getTime(), box.syncedTo));
      await this.openBox(box);
      await this.populateBox(startDate);
    }

    await this.openInbox();
    await this.handleNewMail();
  };

  get user(): User {
    return this.userReference;
  }
}
