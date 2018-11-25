import * as ImapImpl from 'imap';

import logger from '../logger';
import User from '../persistence/user';
import Box from './box';
import {ImapBoxList} from './imapBox';

export default class Imap {
  public get delimiter(): string {
    return this.impl.delimiter;
  }

  public get mailBoxes(): ImapBoxList {
    if (!this.boxes) {
      throw new Error('Imap must be initialized!');
    }

    return this.boxes;
  }

  public readonly user: User;
  private boxes: ImapBoxList;
  private connectionPromise: Promise<void>;
  private impl: any;

  public constructor(user: User) {
    this.user = user;
    this.createImpl();
  }

  public async init() {
    const self = this;
    self.impl.connect();
    await self.connectionPromise;
    await new Promise((resolve, reject) => {
      self.impl.getBoxes((err: Error, boxes: ImapBoxList) => {
        if (err) {
          return reject(err);
        }

        self.boxes = boxes;
        resolve();
      });
    });
  }

  public async openBox(name: string, readonly: boolean): Promise<Box> {
    const self = this;
    return new Promise<Box>((resolve, reject) => {
      self.impl.openBox(name, readonly, (err: Error, box: Box) => {
        if (err) {
          return reject(err);
        }

        resolve(box);
      });
    });
  }

  private createImpl() {
    this.impl = new ImapImpl(this.user);
    let resolve: (() => void) | null;
    let reject: ((error: any) => void) | null;

    this.connectionPromise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const self: Imap = this;
    ['alert', 'close', 'end', 'expunge', 'mail', 'uidvalidity', 'update'].forEach(event => {
      self.impl.once(event, (...args: any[]) => {
        logger.error({
          args,
          event
        });
      });
    });

    this.impl.once('error', (error: Error) => {
      logger.error(error);

      if (reject) {
        reject(error);
      } else {
        logger.warn(`No handler for IMAP error callback.`);
      }

      resolve = null;
      reject = null;

      self.createImpl();
    });
    this.impl.once('ready', () => {
      logger.debug('ready');

      if (resolve) {
        resolve();
      } else {
        logger.warn('More than one ready event - not handled.');
      }

      resolve = null;
      reject = null;
    });
  }
}
