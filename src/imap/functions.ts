import * as Imap from 'imap';

import logger from '../logger';

export type OnDisconnect = () => void;

export function waitForConnection(imap: Imap, callback?: OnDisconnect): Promise<void> {
  let resolve: (() => void) | null;
  let reject: ((error: any) => void) | null;

  const connectionPromise: Promise<void> = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  imap.once('error', (error: Error) => {
    logger.error(error);

    if (!reject && !callback) {
      logger.warn(`No handler for IMAP error callback.`);
    }

    if (reject) {
      reject(error);
    }

    if (callback) {
      callback();
    }

    resolve = null;
    reject = null;
  });
  imap.once('ready', () => {
    logger.debug('ready');

    if (resolve) {
      resolve();
    } else {
      logger.warn('More than one ready event - not handled.');
    }

    resolve = null;
    reject = null;
  });

  imap.connect();

  return connectionPromise;
}
