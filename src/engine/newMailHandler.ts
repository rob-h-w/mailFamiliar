import * as _ from 'lodash';

import Box from './box';
import Promisified from 'imap/promisified';
import logger from '../logger';
import {messageFromBody, IMessage} from './message';
import UserConnection from './userConnection';

export default class NewMailHandler {
  private readonly pImap: Promisified;
  private readonly userConnection: UserConnection;

  constructor(userConnection: UserConnection, pImap: Promisified) {
    this.pImap = pImap;
    this.userConnection = userConnection;
  }

  private messageIdentifier(message: IMessage): string {
    const MAX_LENGTH = 10;
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

    if (box.syncedTo === 0) {
      keep = true;
    } else {
      const recommendedBoxName = this.folderFor(message.headers);
      if (recommendedBoxName && recommendedBoxName !== box.qualifiedName) {
        if (this.userConnection.user.dryRun || this.userConnection.user.trial) {
          const logMessage = `Would move ${this.messageIdentifier(
            message
          )} to ${recommendedBoxName}`;

          logger.warn(logMessage);

          if (this.userConnection.user.trial) {
            // tslint:disable-next-line:no-console
            console.log(logMessage);
          }
        } else {
          // Actually do the move.
          await this.pImap.move([String(message.uid)], recommendedBoxName);
        }
      } else {
        keep = true;
      }
    }

    if (keep) {
      logger.info(`keeping ${this.messageIdentifier(message)} in the inbox.`);

      box.addMessage(message);
      update = true;
    }

    return update;
  }

  public async handleMail(box: Box) {
    const defaultStartDate = this.userConnection.defaultStartDate();
    const syncTo = Math.max(box.syncedTo, defaultStartDate.getTime());
    const uids = await this.pImap.search([[`SINCE`, new Date(syncTo)]]);
    if (_.isEmpty(uids)) {
      return;
    }

    const messageBodies = await this.userConnection.fetch(uids);
    let update = false;

    for (const messageBody of messageBodies.filter(
      messageBody => messageBody.attrs.date.getTime() > syncTo
    )) {
      update = update || (await this.handleMessage(messageFromBody(messageBody), box));
    }

    this.userConnection.predictor.considerBox(box);

    if (update) {
      await this.userConnection.persistence.updateBox(this.userConnection.user, box);
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
