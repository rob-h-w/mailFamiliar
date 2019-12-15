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

const SECOND_IN_MS = 1000;
const DAY_IN_MS = 24 * 60 * 60 * SECOND_IN_MS;
const OPERATION_PAUSE_MS = 100;
const INTER_MAILBOX_PAUSE = 1 * SECOND_IN_MS;

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
  private isPopulatingBox: boolean = false;
  private isShallowSyncing: boolean = false;

  public constructor(persistence: IPersistence, u: User, connectionAttempts: number) {
    const user = withTrialSettings(u);
    this.attempts = connectionAttempts;
    this.persistenceReference = persistence;
    this.pImap = new Promisified(new Imap(user), this);
    this.predictors = createPredictors();
    this.currentPredictor = this.predictors.get(u.predictorType || 'Traat') as IPredictor;
    this.userReference = user;
  }

  get boxes(): ReadonlyArray<Box> {
    return this.mailBoxes;
  }

  private async closeBox() {
    await this.newMailHander.finished();
    if (this.currentlyOpen) {
      const qualifiedName = this.currentlyOpen.qualifiedName;
      logger.debug({qualifiedName, state: 'open'}, 'closeBox');
      try {
        await this.pImap.closeBox();
        logger.debug({qualifiedName, state: 'closed'}, 'closeBox');
      } catch (e) {
        if (e.message && e.message === 'No mailbox is currently selected') {
          logger.error(e);
          return;
        } else {
          throw e;
        }
      } finally {
        this.currentlyOpen = undefined;
      }
    }
  }

  private collectMailboxes(boxRoot: Imap.MailBoxes = {}, delimiter?: string, parent?: Box): Box[] {
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
  }

  get connectionAttempts() {
    return this.attempts;
  }

  defaultStartDate = () => new Date(Date.now() - DAY_IN_MS * this.user.syncWindowDays);

  disconnect = async () => {
    try {
      await this.pImap.closeBox();
    } catch {}
  };

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

  async handleNewMail() {
    if (this.currentlyOpen) {
      await this.newMailHander.handleMail(this.currentlyOpen);
    }
  }

  public async init() {
    logger.debug('starting connection init');
    const persistedBoxes: ReadonlyArray<Box> = (await this.persistence.listBoxes(this.user)) || [];
    await this.pImap.waitForConnection(() => {
      this.currentlyOpen = undefined;
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
    await this.refresh();

    logger.info('init complete');
  }

  public onClose(hadError: boolean) {
    logger.warn(
      `Connection for ${_.get(this, 'userReference.user', 'unknown user')} closed${
        hadError ? ' with error.' : '.'
      }`
    );
    if (this.onDisconnect) {
      this.onDisconnect();
    }
  }

  get onDisconnect() {
    return this.disconnectCallback;
  }

  set onDisconnect(callback: OnDisconnect | undefined) {
    this.disconnectCallback = callback;
  }

  public onExpunge = async (seqNo: number) => {
    logger.debug({seqNo}, 'onExpunge');
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

  public onMail = async (count: number) => {
    logger.debug({count}, 'onMail');
    await this.handleNewMail();
    logger.debug('New mails handled');
  };

  public onUidValidity = async (uidValidity: number) => {
    logger.debug({uidValidity}, 'onUidValidity');
    const box = this.currentlyOpen;
    if (box && _.get(box, 'uidValidity') !== uidValidity) {
      // regenerate the entire box.
      await this.resetBox();
    }
  };

  public async shutdown() {}

  private openBox = async (box: Box) => {
    logger.debug(
      {
        previousQualifiedName: this.currentlyOpen ? this.currentlyOpen.qualifiedName : 'null',
        qualifiedName: box.qualifiedName
      },
      'openBox'
    );

    if (this.currentlyOpen === box) {
      return;
    }

    await this.newMailHander.finished();
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

    if (!this.currentlyOpen) {
      await this.openBox(box);
    } else {
      logger.debug(`Opened ${this.currentlyOpen.qualifiedName}`);
    }
  };

  private async openInbox() {
    await this.closeBox();

    if (!this.inbox) {
      return;
    }

    await this.openBox(this.inbox);
  }

  private async pause(timeMs: number = OPERATION_PAUSE_MS) {
    return new Promise(resolve => setTimeout(resolve, timeMs));
  }

  private async populateBox(startDate?: Date) {
    if (!this.currentlyOpen || this.isPopulatingBox) {
      return;
    }

    this.isPopulatingBox = true;

    try {
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
          await this.pause();
        }
      } else {
        this.currentlyOpen.syncedTo = startDate.getTime();
      }

      await this.persistence.updateBox(this.user, this.currentlyOpen);

      // Update box may have the consequence of making this.currentlyOpen undefined.
      if (this.currentlyOpen) {
        this.currentPredictor.considerBox(this.currentlyOpen);
      }
    } finally {
      this.isPopulatingBox = false;
    }
  }

  get persistence(): IPersistence {
    return this.persistenceReference;
  }

  get predictor(): IPredictor {
    return this.currentPredictor;
  }

  private refresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    this.refreshTimer = setTimeout(
      this.refresh.bind(this),
      this.user.refreshPeriodMinutes * 60 * 1000,
      this
    );

    return this.shallowSync();
  }

  private async resetBox() {
    if (!this.currentlyOpen) {
      return;
    }

    this.currentlyOpen.reset();
    await this.populateBox();
  }

  private async shallowSync() {
    await this.shallowSyncSince(this.defaultStartDate());
  }

  private async shallowSyncSince(
    date: Date,
    excluding: string[] = [],
    resetSyncedTo: boolean = false
  ) {
    if (this.isShallowSyncing) {
      return;
    }

    try {
      this.isShallowSyncing = true;
      for (const box of this.boxes
        .filter(box => canLearnFrom(box.qualifiedName))
        .filter(box => excluding.indexOf(box.qualifiedName) === -1)) {
        if (resetSyncedTo) {
          box.syncedTo = date.getTime();
        }

        const startDate = new Date(Math.max(date.getTime(), box.syncedTo));
        await this.openBox(box);
        await this.populateBox(startDate);
        await this.pause(INTER_MAILBOX_PAUSE);
      }

      await this.openInbox();
      await this.handleNewMail();

      logger.info(`shallow sync complete`);
    } finally {
      this.isShallowSyncing = false;
    }
  }

  get user(): User {
    return this.userReference;
  }
}
