import * as Imap from 'imap';
import {promisify} from 'util';

import {OnDisconnect, waitForConnection} from './functions';
import logger from '../logger';

export interface BoxListener {
  onAlert: (message: string) => void;
  onClose: (hadError: boolean) => void;
  onEnd: () => void;
  onExpunge: (seqNo: number) => void;
  onMail: (count: number) => void;
  onUidValidity: (validity: number) => void;
  onUpdate: (seqNo: number, info: any) => void;
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
            uid: 0,
          },
          seqno,
        };
        message.on('attributes', (attrs) => {
          msg.attrs = attrs;
        });
        message.on('body', (stream, info) => {
          msg.bodyInfo = info;
          stream.on('data', (chunk) => {
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
      fetch.on('error', (error) => {
        reject(error);
      });
    });
  }; // fetch(source: any /* MessageSource */, options: FetchOptions): ImapFetch

  private setBoxListener = (listener: BoxListener): void => {
    this.onEvent('alert', listener.onAlert, listener);
    this.onEvent('close', listener.onClose, listener);
    this.onEvent('end', listener.onEnd, listener);
    this.onEvent('expunge', listener.onExpunge, listener);
    this.onEvent('mail', listener.onMail, listener);
    this.onEvent('uidvalidity', listener.onUidValidity, listener);
    this.onEvent('update', listener.onUpdate, listener);
  };

  private onEvent(eventName: string, listenerFunction: Function, listener: BoxListener): void {
    const bound = listenerFunction.bind(listener);
    this.imap.on(eventName, (...args: any): void => {
      logger.debug(`received ${eventName}(${args})`);
      return bound(...args);
    });
  }

  waitForConnection = (callback?: OnDisconnect): Promise<void> => {
    return waitForConnection(this.imap, callback);
  };
}
