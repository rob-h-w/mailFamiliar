import * as _ from 'lodash';

import Box from './box';
import Promisified from 'imap/promisified';
import logger from '../logger';
import {messageFromBody, IMessage} from './message';
import UserConnection from './userConnection';
import {getSyncedTo} from '../tools/trialSettings';

export default class NewMailHandler {
  private readonly pImap: Promisified;
  private readonly userConnection: UserConnection;

  constructor(userConnection: UserConnection, pImap: Promisified) {
    this.pImap = pImap;
    this.userConnection = userConnection;
  }

  private messageIdentifier(message: IMessage): string {
    const MAX_LENGTH = 20;
    const FROM = 'From: ';
    const SUBJECT = 'Subject: ';
    const hdrs = message.headers;
    const from = hdrs.substr(hdrs.indexOf(FROM) + FROM.length, MAX_LENGTH);
    const subject = hdrs.substr(hdrs.indexOf(SUBJECT) + SUBJECT.length, MAX_LENGTH);
    return `{${message.uid} from ${from} subject ${subject}}`;
  }

  private async handleMessage(message: IMessage, box: Box): Promise<boolean> {
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
          const logMessage = `Would move ${this.messageIdentifier(
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
          logger.info(`Moved ${this.messageIdentifier(message)} to ${recommendedBoxName}`);
        }
      } else {
        keep = true;
      }
    }

    if (keep) {
      const logMessage = `Keeping ${this.messageIdentifier(message)} in the inbox.`;
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

  public async handleMail(box: Box) {
    const defaultStartDate = this.userConnection.defaultStartDate();
    const syncTo = Math.max(getSyncedTo(box), defaultStartDate.getTime());
    const uids = await this.pImap.search([[`SINCE`, new Date(syncTo)]]);
    if (_.isEmpty(uids)) {
      return;
    }

    const messageBodies = await this.userConnection.fetch(uids);
    let update = false;

    for (const messageBody of messageBodies.filter(
      messageBody => messageBody.attrs.date.getTime() > syncTo
    )) {
      update = (await this.handleMessage(messageFromBody(messageBody), box)) || update;
    }

    this.userConnection.predictor.considerBox(box);

    if (update) {
      await this.userConnection.persistence.updateBox(this.userConnection.user, box);
    }

    const trial = this.userConnection.user.trial;
    if (trial && trial.newMailHandled) {
      trial.newMailHandled();
    }
  }

  private folderFor = (headers: string): string | null => {
    const scores = this.userConnection.predictor.folderScore(headers);
    let folderName = null;
    let first = 0;
    let second = 0;

    for (const [fullyQualifiedName, score] of scores.entries()) {
      if (score > first) {
        second = first;
        first = score;
        folderName = fullyQualifiedName;
      } else if (score > second) {
        second = score;
      }
    }

    if (first - second > this.userConnection.user.moveThreshold) {
      return folderName;
    }
    return null;
  };
}
