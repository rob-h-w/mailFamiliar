import * as Imap from 'imap';
import {Map} from 'immutable';
import * as _ from 'lodash';

import Box from './box';
import {BadStateException} from './exceptions';
import {canLearnFrom} from '../imap/boxFeatures';
import {OnDisconnect} from '../imap/functions';
import Promisified, {BoxListener, MessageBody} from '../imap/promisified';
import logger from '../logger';
import NewMailHandler from './newMailHandler';
import {MissingDisconnectionCallback} from '../persistence/exceptions';
import Persistence from '../persistence/persistence';
import User from '../persistence/user';
import Predictor from './predictor';
import {create as createPredictors, PredictorType} from './predictors';
import {getSyncedTo, withTrialSettings} from '../tools/trialSettings';
import {messageFromBody, Message} from '../types/message';
import Move, {createMovesFromJson} from '../types/move';
import MistakeTracker from './mistakeTracker';
import Mistake from 'types/mistake';

const SECOND_IN_MS = 1000;
const DAY_IN_MS = 24 * 60 * 60 * SECOND_IN_MS;
const OPERATION_PAUSE_MS = 100;
const INTER_MAILBOX_PAUSE = 1 * SECOND_IN_MS;

export default class UserConnection implements BoxListener {
  private attempts: number;
  private currentlyOpen?: Box;
  private disconnectCallback?: OnDisconnect;
  private inbox?: Box;
  private mailBoxes?: ReadonlyArray<Box>;
  private newMailHander: NewMailHandler;
  private readonly persistenceReference: Persistence;
  private readonly pImap: Promisified;
  private readonly predictors: Map<PredictorType, Predictor>;
  private readonly currentPredictor: Predictor;
  private refreshTimer?: NodeJS.Timer;
  private readonly userReference: User;
  private isPopulatingBox = false;
  private isShallowSyncing = false;
  private mistakeTracker?: MistakeTracker;
  private movesList: Move[];
  private movesMap: {[index: string]: Move};

  public constructor(persistence: Persistence, u: User, connectionAttempts: number) {
    const user = withTrialSettings(u);
    this.attempts = connectionAttempts;
    this.persistenceReference = persistence;
    this.pImap = new Promisified(new Imap(user), this);
    this.movesList = [];
    this.movesMap = {};
    this.newMailHander = new NewMailHandler(this, this.pImap);
    this.predictors = createPredictors();
    this.currentPredictor = this.predictors.get(u.predictorType || 'Traat') as Predictor;
    this.userReference = user;
  }

  get boxes(): ReadonlyArray<Box> | undefined {
    return this.mailBoxes;
  }

  private async closeBox(): Promise<void> {
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
      const qualifiedName = `${root}${name}`;
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

  get connectionAttempts(): number {
    return this.attempts;
  }

  defaultStartDate = (): Date => new Date(Date.now() - DAY_IN_MS * this.user.syncWindowDays);

  disconnect = async (): Promise<void> => {
    try {
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = undefined;
      }

      this.disconnectCallback = undefined;

      await this.pImap.closeBox();
      // eslint-disable-next-line no-empty
    } catch {}
  };

  fetch = (source: any, seq = false): Promise<readonly MessageBody[]> => {
    const fetchObj = seq ? this.pImap.imap.seq : this.pImap.imap;
    return this.pImap.fetch(
      fetchObj.fetch(source, {
        bodies: 'HEADER',
        envelope: true,
        size: true
      })
    );
  };

  async handleNewMail(): Promise<void> {
    if (this.currentlyOpen) {
      await this.newMailHander.handleMail(this.currentlyOpen);
    }
  }

  public async init(): Promise<void> {
    logger.debug('starting connection init');
    const persistedBoxes: ReadonlyArray<Box> = (await this.persistence.listBoxes(this.user)) || [];
    this.movesList = this.movesList.concat(
      createMovesFromJson(await this.persistence.listMoves(this.user))
    );
    this.movesList.forEach(move => (this.movesMap[move.message.headers] = move));
    await this.pImap.waitForConnection(() => {
      this.currentlyOpen = undefined;
      if (this.disconnectCallback) {
        this.disconnectCallback();
      }
    });
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
    this.mailBoxes.forEach(box => this.currentPredictor.considerBox(box));
    await this.openInbox();
    this.attempts = 0;
    await this.refresh();
    this.mistakeTracker = new MistakeTracker(
      this.movesList,
      this.boxes as Box[],
      (mistake: Mistake): void => this.predictor.addMistake(mistake)
    );

    logger.info('init complete');
  }

  public hasMove(headers: string): boolean {
    return this.movesMap[headers] !== undefined;
  }

  public moveByHeaders(headers: string): Move {
    const move = this.movesMap[headers];
    if (move === undefined) {
      throw new Error(`${headers} was not moved.`);
    }
    return move;
  }

  public async recordMove(move: Move): Promise<void> {
    const headers = move.message.headers;

    if (!this.hasMove(headers)) {
      this.movesList.push(move);
      this.movesMap[headers] = move;
      this.mistakeTracker?.addMove(move);
    }

    await this.persistence.recordMoves(this.user, this.movesList);
  }

  public onClose(hadError: boolean): void {
    logger.warn(
      `Connection for ${_.get(this, 'userReference.user', 'unknown user')} closed${
        hadError ? ' with error.' : '.'
      }`
    );

    if (this.disconnectCallback) {
      this.disconnectCallback();
    } else {
      throw new MissingDisconnectionCallback();
    }
  }

  set onDisconnect(callback: OnDisconnect | undefined) {
    this.disconnectCallback = callback;
  }

  public onEnd(): void {
    logger.debug('Connection ended.');

    if (this.disconnectCallback) {
      logger.debug('Attempting to reconnect.');
      this.disconnectCallback();
    } else {
      logger.debug('No disconnect callback found.');
      throw new MissingDisconnectionCallback();
    }
  }

  public onExpunge = async (seqNo: number): Promise<void> => {
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

    if (this.currentlyOpen.isInbox && this.hasMove(expungedMessage.headers)) {
      // We moved the message. All good.
      return;
    }

    this.currentlyOpen.removeMessage(expungedMessage);
    this.currentPredictor.removeHeaders(expungedMessage.headers, this.currentlyOpen.qualifiedName);

    // Trigger check of all other boxen in case the message moved there.
    await this.shallowSyncSince(expungedMessage.date, [this.currentlyOpen.qualifiedName], true);
  };

  public onMail = async (count: number): Promise<void> => {
    logger.debug({count}, 'onMail');
    await this.handleNewMail();
    logger.debug('New mails handled');
  };

  public onUidValidity = async (uidValidity: number): Promise<void> => {
    logger.debug({uidValidity}, 'onUidValidity');
    const box = this.currentlyOpen;
    if (box && _.get(box, 'uidValidity') !== uidValidity) {
      // regenerate the entire box.
      await this.resetBox();
    }
  };

  public async shutdown(): Promise<void> {}

  private openBox = async (box: Box): Promise<void> => {
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

  private async openInbox(): Promise<void> {
    if (this.currentlyOpen && this.currentlyOpen.isInbox) {
      return;
    }

    await this.closeBox();

    if (!this.inbox) {
      return;
    }

    await this.openBox(this.inbox);
  }

  private async pause(timeMs: number = OPERATION_PAUSE_MS): Promise<NodeJS.Timeout> {
    return new Promise(resolve => setTimeout(resolve, timeMs));
  }

  private async populateBox(startDate?: Date): Promise<Message[]> {
    if (!this.currentlyOpen || this.isPopulatingBox) {
      return [];
    }

    this.isPopulatingBox = true;

    const newMessages = [];
    const shouldBeOpen = this.currentlyOpen;

    try {
      if (_.isUndefined(startDate) || this.user.trial) {
        startDate = new Date(
          Math.max(this.defaultStartDate().getTime(), getSyncedTo(this.currentlyOpen))
        );
      }

      const search = await this.pImap.search([['SINCE', startDate]]);
      if (search.length) {
        const messages = await this.fetch(search);

        // Ensure the same box is still open.
        await this.openBox(shouldBeOpen);

        for (const messageBody of messages) {
          const message = messageFromBody(messageBody);
          this.currentlyOpen.addMessage(message);
          newMessages.push(message);
          await this.pause();
        }
      } else {
        this.currentlyOpen.syncedTo = startDate.getTime();
      }

      await this.persistence.updateBox(this.user, this.currentlyOpen);

      // Ensure the same box is still open.
      await this.openBox(shouldBeOpen);
      return newMessages;
    } finally {
      this.isPopulatingBox = false;
    }
  }

  get persistence(): Persistence {
    return this.persistenceReference;
  }

  get predictor(): Predictor {
    return this.currentPredictor;
  }

  private refresh(): Promise<void> {
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

  private async resetBox(): Promise<void> {
    if (!this.currentlyOpen) {
      return;
    }

    const predictor = this.currentPredictor;
    const shouldBeOpen = this.currentlyOpen;
    shouldBeOpen.reset();
    this.addToPredictor(predictor, await this.populateBox(), shouldBeOpen.qualifiedName);
  }

  private addToPredictor(
    predictor: Predictor,
    messages: ReadonlyArray<Message>,
    qualifiedName: string
  ): void {
    messages.forEach(message => {
      predictor.addHeaders(message.headers, qualifiedName);
      this.mistakeTracker?.inspectMessage(qualifiedName, message);
    });
  }

  private async shallowSync(): Promise<void> {
    await this.shallowSyncSince(this.defaultStartDate());
  }

  private async shallowSyncSince(
    date: Date,
    excluding: string[] = [],
    resetSyncedTo = false
  ): Promise<void> {
    if (this.isShallowSyncing) {
      return;
    }

    try {
      this.isShallowSyncing = true;
      if (this.boxes === undefined) {
        throw new BadStateException('Mailboxes have not yet been retrieved.');
      }

      for (const box of this.boxes
        .filter(box => canLearnFrom(box.qualifiedName))
        .filter(box => excluding.indexOf(box.qualifiedName) === -1)) {
        if (resetSyncedTo) {
          box.syncedTo = date.getTime();
        }

        const startDate = new Date(Math.max(date.getTime(), box.syncedTo));
        await this.openBox(box);
        this.addToPredictor(
          this.currentPredictor,
          await this.populateBox(startDate),
          box.qualifiedName
        );
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
