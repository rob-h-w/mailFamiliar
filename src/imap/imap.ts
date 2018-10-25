const ImapImpl:any = require('imap');

import logger from '../logger';

export default class Imap {
  private boxes: Object;
  private connectionPromise: Promise<void>;
  private impl: any;
  private parameters: Object;

  private createImpl() {
    this.impl = new ImapImpl(this.parameters);
    let resolve: Function;
    let reject: Function;

    this.connectionPromise = new Promise((res: Function, rej: Function) => {
      resolve = res;
      reject = rej;
    });

    const self:Imap = this;
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

  public constructor (parameters) {
    this.parameters = parameters;
    this.createImpl();
  }

  public async init() {
    const self = this;
    self.impl.connect();
    await self.connectionPromise;
    await new Promise((resolve, reject) => {
      self.impl.getBoxes((err: Object, boxes: Object) => {
        if (err) {
          return reject(err);
        }

        self.boxes = boxes;
        resolve();
      })
    });
  }

  public get mailBoxes(): Object {
    if (!this.boxes) {
      throw new Error('Imap must be initialized!');
    }

    return this.boxes;
  }
};
