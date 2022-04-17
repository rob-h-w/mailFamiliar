import * as Imap from 'imap';
import {promisify} from 'util';

import {OnDisconnect, waitForConnection} from './functions';
import logger from '../logger';
import ListenerManager from '../events/listenerManager';

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
  readonly imapMessageManager: ListenerManager;

  readonly closeBox: () => Promise<void>;
  readonly getBoxes: () => Promise<Imap.MailBoxes>;
  readonly move: (messageUids: string[], folder: string) => Promise<void>;
  readonly openBox: (mailboxName: string) => Promise<Imap.Box>;
  readonly search: (criteria: any[]) => Promise<number[]>;
  readonly subscribeBox: (mailboxName: string) => Promise<void>;

  constructor(imap: Imap, listener: BoxListener) {
    this.imap = imap;
    this.imapMessageManager = new ListenerManager(imap);
    this.setBoxListener(listener);

    this.closeBox = promisify(imap.closeBox.bind(imap));
    this.getBoxes = promisify(imap.getBoxes.bind(imap));
    this.move = promisify(imap.move.bind(imap));
    this.openBox = promisify(imap.openBox.bind(imap));
    this.search = promisify(imap.search.bind(imap));
    this.subscribeBox = promisify(imap.subscribeBox.bind(imap));
  }

  public close(): void {
    this.imapMessageManager.close();
  }

  public fetch(fetch: Imap.ImapFetch): Promise<ReadonlyArray<MessageBody>> {
    const fetchManager = new ListenerManager(fetch);
    return new Promise<ReadonlyArray<MessageBody>>((resolve, reject) => {
      const messages: MessageBody[] = [];
      fetchManager.on('message', (message: Imap.ImapMessage, seqno: number) => {
        const messageManager = new ListenerManager(message);
        const msg: MessageBody = {
          attrs: {
            date: new Date(),
            flags: [],
            uid: 0
          },
          seqno
        };
        messageManager.on('attributes', attrs => {
          msg.attrs = attrs;
        });
        messageManager.on(
          'body',
          (stream: NodeJS.ReadableStream, info: Imap.ImapMessageBodyInfo) => {
            msg.bodyInfo = info;
            const streamManager = new ListenerManager(stream);
            streamManager.on('data', chunk => {
              msg.body = msg.body || '';
              msg.body += chunk.toString();
            });
            streamManager.once('end', () => streamManager.close());
          }
        );
        messageManager.on('end', () => {
          messageManager.close();
          messages.push(msg);
        });
      });
      fetchManager.on('end', () => {
        fetchManager.close();
        resolve(messages);
      });
      fetchManager.on('error', error => {
        reject(error);
      });
    });
  }

  private setBoxListener(listener: BoxListener): void {
    this.onEvent('alert', listener.onAlert, listener);
    this.onEvent('close', listener.onClose, listener);
    this.onEvent('end', listener.onEnd, listener);
    this.onEvent('expunge', listener.onExpunge, listener);
    this.onEvent('mail', listener.onMail, listener);
    this.onEvent('uidvalidity', listener.onUidValidity, listener);
    this.onEvent('update', listener.onUpdate, listener);
  }

  private onEvent(
    eventName: string,
    listenerFunction: (...args: any) => any,
    listener: BoxListener
  ): void {
    const bound = listenerFunction.bind(listener);
    this.imapMessageManager.on(eventName, (...args: any): void => {
      logger.debug(`received ${eventName}(${args})`);
      return bound(...args);
    });
  }

  public waitForConnection(callback?: OnDisconnect): Promise<void> {
    return waitForConnection(this.imap, callback);
  }
}
