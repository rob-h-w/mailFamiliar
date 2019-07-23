import * as _ from 'lodash';

import Box from './box';
import {canMoveTo} from '../imap/boxFeatures';
import Promisified, {IMessageBody} from 'imap/promisified';
import logger from '../logger';
import {messageFromBody, IMessage} from './message';
import UserConnection from './userConnection';
import {getSyncedTo} from '../tools/trialSettings';

export default class NewMailHandler {
  private readonly pImap: Promisified;
  private readonly userConnection: UserConnection;
  private readonly waitStack: (() => void)[] = [];
  private workCount: number = 0;

  constructor(userConnection: UserConnection, pImap: Promisified) {
    this.pImap = pImap;
    this.userConnection = userConnection;
  }

  private static messageIdentifier(message: IMessage): string {
    const MAX_LENGTH = 20;
    const FROM = 'From: ';
    const SUBJECT = 'Subject: ';
    const hdrs = message.headers;
    const from = hdrs.substr(hdrs.indexOf(FROM) + FROM.length, MAX_LENGTH);
    const subject = hdrs.substr(hdrs.indexOf(SUBJECT) + SUBJECT.length, MAX_LENGTH);
    return `{${message.uid} from ${from} subject ${subject}}`;
  }

  private static messageWasSeen(messageBody: IMessageBody): boolean {
    const flags = messageBody.attrs.flags;
    return _.isArray(flags) && flags.indexOf('\\Seen') !== -1;
  }

  private async handleMessage(message: IMessage, box: Box): Promise<boolean> {
    logger.debug(
      {qualifiedName: box.qualifiedName, message: NewMailHandler.messageIdentifier(message)},
      'handleMessage'
    );
    let update = false;
    let keep = false;

    const user = this.userConnection.user;
    const trial = user.trial;

    if (box.syncedTo === 0) {
      keep = true;
    } else {
      const recommendedBoxName = this.folderFor(message.headers);
      if (recommendedBoxName && recommendedBoxName !== box.qualifiedName) {
        if (user.dryRun || trial) {
          const logMessage = `Would move ${NewMailHandler.messageIdentifier(
            message
          )} to ${recommendedBoxName}`;

          if (trial) {
            // tslint:disable-next-line:no-console
            console.log(logMessage);
          } else {
            logger.warn(logMessage);
          }
        } else {
          // Actually do the move.
          await this.pImap.move([String(message.uid)], recommendedBoxName);
          logger.info(
            `Moved ${NewMailHandler.messageIdentifier(message)} to ${recommendedBoxName}`
          );
        }
      } else {
        keep = true;
      }
    }

    if (keep) {
      const logMessage = `Keeping ${NewMailHandler.messageIdentifier(message)} in the inbox.`;
      if (trial) {
        // tslint:disable-next-line:no-console
        console.log(logMessage);
      } else {
        logger.info(logMessage);
      }

      box.addMessage(message);
      update = true;
    }

    return update;
  }

  private lock() {
    this.workCount++;
  }

  private release() {
    this.workCount--;
    while (this.workCount === 0 && this.waitStack.length) {
      (this.waitStack.pop() as () => void)();
    }
  }

  public async handleMail(box: Box) {
    logger.debug({qualifiedName: box.qualifiedName}, 'handleMail');
    this.lock();
    try {
      const defaultStartDate = this.userConnection.defaultStartDate();
      const syncTo = Math.max(getSyncedTo(box), defaultStartDate.getTime());
      const uids = await this.pImap.search([[`SINCE`, new Date(syncTo)]]);
      if (_.isEmpty(uids)) {
        return;
      }

      const messageBodies = await this.userConnection.fetch(uids);
      let update = false;

      if (box.isInbox) {
        for (const messageBody of messageBodies.filter(
          messageBody =>
            messageBody.attrs.date.getTime() > syncTo && !NewMailHandler.messageWasSeen(messageBody)
        )) {
          update = (await this.handleMessage(messageFromBody(messageBody), box)) || update;
        }
      }

      this.userConnection.predictor.considerBox(box);

      box.setSyncedToNow();

      if (update) {
        await this.userConnection.persistence.updateBox(this.userConnection.user, box);
      }

      const trial = this.userConnection.user.trial;
      if (trial && trial.newMailHandled) {
        trial.newMailHandled();
      }
    } finally {
      this.release();
    }
  }

  public async finished() {
    return new Promise(resolve => {
      if (this.workCount === 0) {
        resolve();
      } else {
        this.waitStack.push(resolve);
      }
    });
  }

  private folderFor = (headers: string): string | null => {
    const scores = this.userConnection.predictor.folderScore(headers);
    let folderName = null;
    let secondHighestFolderName = null;
    let destination = 0;
    let inbox = 0;
    let secondHighest = 0;

    for (const [fullyQualifiedName, score] of scores.entries()) {
      if (Box.isInbox(fullyQualifiedName)) {
        inbox = score;
      }

      if (!canMoveTo(fullyQualifiedName)) {
        continue;
      }

      if (score > destination) {
        secondHighest = destination;
        secondHighestFolderName = folderName;
        destination = score;
        folderName = fullyQualifiedName;
      }
    }

    logger.info({
      headers,
      msg: 'scores',
      scores: [
        {name: folderName, score: destination},
        {name: secondHighestFolderName, score: secondHighest},
        {name: 'inbox', score: inbox}
      ]
    });

    const moveConfidence = destination - secondHighest * inbox;

    if (moveConfidence > this.userConnection.user.moveThreshold) {
      return folderName;
    }

    return null;
  };
}
