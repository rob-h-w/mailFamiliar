const ImapImpl:any = require('imap');

import Box from './box';
import { ImapBoxList } from './imapBox';
import logger from '../logger';
import User from '../persistence/user';

export default class Imap {
  private boxes: ImapBoxList;
  private connectionPromise: Promise<void>;
  private impl: any;

  public readonly user: User;

  private createImpl() {
    this.impl = new ImapImpl(this.user);
    let resolve: Function;
    let reject: Function;

    this.connectionPromise = new Promise((res: Function, rej: Function) => {
      resolve = res;
      reject = rej;
    });

    const self:Imap = this;
    [
      'alert',
      'close',
      'end',
      'expunge',
      'mail',
      'uidvalidity',
      'update'
    ].forEach((event) => {
      self.impl.once(event, (...args) => {
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

  public constructor (user: User) {
    this.user = user;
    this.createImpl();
  }

  public get delimiter(): string {
    return this.impl.delimiter;
  }

  public async init() {
    const self = this;
    self.impl.connect();
    await self.connectionPromise;
    await new Promise((resolve, reject) => {
      self.impl.getBoxes((err: Object, boxes: ImapBoxList) => {
        if (err) {
          return reject(err);
        }

        self.boxes = boxes;
        resolve();
      })
    });
  }

  public get mailBoxes(): ImapBoxList {
    if (!this.boxes) {
      throw new Error('Imap must be initialized!');
    }

    return this.boxes;
  }

  public async openBox(name: string, readonly: boolean): Promise<Box> {
    return new Promise<Box>((resolve, reject) => {
      imap.openBox(name, readonly, (err, box) => {
        if (err) {
          return reject(err);
        }

        resolve(box);
      });
    });
  }
};
