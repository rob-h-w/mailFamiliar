import * as Imap from 'imap';
import {promisify} from 'util';

import {OnDisconnect, waitForConnection} from './functions';
import logger from '../logger';

export interface BoxListener {
  onClose: (hadError: boolean) => void;
  onEnd: () => void;
  onExpunge: (seqNo: number) => void;
  onMail: (count: number) => void;
  onUidValidity: (validity: number) => void;
}

export interface MessageBody {
  attrs: Imap.ImapMessageAttributes;
  body?: any;
  bodyInfo?: Imap.ImapMessageBodyInfo;
  seqno: number;
}

export default class Promisified {
  readonly imap: Imap;

  readonly closeBox: () => Promise<void>;
  readonly getBoxes: () => Promise<Imap.MailBoxes>;
  readonly move: (messageUids: string[], folder: string) => Promise<void>;
  readonly openBox: (mailboxName: string) => Promise<Imap.Box>;
  readonly search: (criteria: any[]) => Promise<number[]>;
  readonly subscribeBox: (mailboxName: string) => Promise<void>;

  constructor(imap: Imap, listener: BoxListener) {
    this.imap = imap;
    this.setBoxListener(listener);

    this.closeBox = promisify(imap.closeBox.bind(imap));
    this.getBoxes = promisify(imap.getBoxes.bind(imap));
    this.move = promisify(imap.move.bind(imap));
    this.openBox = promisify(imap.openBox.bind(imap));
    this.search = promisify(imap.search.bind(imap));
    this.subscribeBox = promisify(imap.subscribeBox.bind(imap));
  }

  fetch = (fetch: Imap.ImapFetch): Promise<ReadonlyArray<MessageBody>> => {
    return new Promise<ReadonlyArray<MessageBody>>((resolve, reject) => {
      const messages: MessageBody[] = [];
      fetch.on('message', (message, seqno) => {
        const msg: MessageBody = {
          attrs: {
            date: new Date(),
            flags: [],
            uid: 0
          },
          seqno
        };
        message.on('attributes', attrs => {
          msg.attrs = attrs;
        });
        message.on('body', (stream, info) => {
          msg.bodyInfo = info;
          stream.on('data', chunk => {
            msg.body = msg.body || '';
            msg.body += chunk.toString();
          });
        });
        message.on('end', () => {
          messages.push(msg);
        });
      });
      fetch.on('end', () => {
        resolve(messages);
      });
      fetch.on('error', error => {
        reject(error);
      });
    });
  }; // fetch(source: any /* MessageSource */, options: FetchOptions): ImapFetch

  private setBoxListener = (listener: BoxListener): void => {
    this.imap.on('close', listener.onClose);
    this.imap.on('end', listener.onEnd);
    this.imap.on('expunge', listener.onExpunge);
    this.imap.on('mail', listener.onMail);
    this.imap.on('uidvalidity', listener.onUidValidity);
    ['alert', 'update'].forEach(event => {
      this.imap.on(event, (...args: any[]) => {
        logger.error({
          args,
          event
        });
      });
    });
  };

  waitForConnection = (callback?: OnDisconnect): Promise<void> => {
    return waitForConnection(this.imap, callback);
  };
}
