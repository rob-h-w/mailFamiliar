import * as Imap from 'imap';
import * as _ from 'lodash';
import {Literal, Static, Union} from 'runtypes';

import {ImapBoxMissingException} from './exceptions';
import Promisified from '../imap/promisified';
import logger from '../logger';
import {Message} from '../types/message';

interface BoxRequired {
  name: string;
  qualifiedName: string;
  syncedTo: number;
}

export interface BoxPersisted extends BoxRequired {
  box?: Imap.Box;
  messages?: ReadonlyArray<Message>;
}

interface BoxAndFolder extends BoxPersisted {
  imapFolder?: Imap.Folder;
  pImap?: Promisified;
}

const BoxStateValues = Union(
  Literal('UNREADY'),
  Literal('UNCHANGED'),
  Literal('UIDS_INVALID'),
  Literal('NEW')
);
export type BoxState = Static<typeof BoxStateValues>;

function msgHashString(message: Message): string {
  return `${message.date}${message.uid}`;
}

export default class Box {
  private imapBox?: Imap.Box;
  private imapFolder?: Imap.Folder;
  private messageList: Message[] = [];
  private msgHashes: {
    [key: string]: Message;
  };
  private pImap?: Promisified;
  private startingSeq?: number;
  private syncedToEpoch: number;

  readonly name: string;
  readonly qualifiedName: string;

  private static check(box: Box): void {
    if (!box.pImap) {
      throw new Error(`Box named ${box.qualifiedName} does not have an IMAP implementation.`);
    }

    if (!box.imapFolder) {
      throw new Error(`Box named ${box.qualifiedName} does not have an IMAP folder.`);
    }
  }

  public static isInbox(fullyQualifiedName: string): boolean {
    return !!fullyQualifiedName && fullyQualifiedName.toUpperCase() === 'INBOX';
  }

  constructor({box, imapFolder, messages, name, pImap, qualifiedName, syncedTo}: BoxAndFolder) {
    this.imapBox = box;
    this.imapFolder = imapFolder;
    this.name = name;
    this.msgHashes = {};
    this.pImap = pImap;
    this.qualifiedName = qualifiedName;
    this.syncedToEpoch = syncedTo;

    if (messages) {
      for (const msg of messages) {
        this.addMessageHash(msg);
      }

      this.messageList.push(...messages);
    }
  }

  addMessage = (message: Message): void => {
    const messageIndex = this.indexOf(message.seq);
    const messageCopy = {...message};

    // We encode the sequence by ordering. Ensure the seq member doesn't
    // pollute hash calculations.
    messageCopy.seq = 0;

    this.messageList.splice(messageIndex, 0, messageCopy);
    this.addMessageHash(messageCopy);
    this.syncedToEpoch = Math.max(this.syncedToEpoch, messageCopy.date.getTime());
  };

  private addMessageHash = (message: Message): void => {
    this.msgHashes[msgHashString(message)] = message;
  };

  get box(): Imap.Box | undefined {
    return this.imapBox;
  }

  private hasMessage = (message: Message): boolean => {
    const hashString = msgHashString(message);
    return !!this.msgHashes[hashString];
  };

  get isInbox(): boolean {
    return Box.isInbox(this.qualifiedName);
  }

  mergeFrom(box: Box): void {
    if (box.qualifiedName !== this.qualifiedName) {
      throw new Error(`Attempt to merge ${box.qualifiedName} into ${this.qualifiedName}`);
    }

    this.imapFolder = this.imapFolder || box.imapFolder;
    Object.assign(this.msgHashes, box.msgHashes);
    this.pImap = this.pImap || box.pImap;
    this.syncedToEpoch = Math.max(box.syncedToEpoch, this.syncedToEpoch);

    Box.check(this);
  }

  get messages(): ReadonlyArray<Message> {
    return this.messageList;
  }

  /*
  server seq:     1, 2, 3, 4
  client indices:       0, 1

  seqOffset = server seq - client list length
  */
  private seqOffset(): number {
    if (!this.imapBox) {
      throw new ImapBoxMissingException(this);
    }

    if (this.startingSeq === undefined) {
      this.startingSeq = this.imapBox?.messages.total - this.messageList.length;
    }

    return this.startingSeq;
  }

  private indexOf(seq: number): number {
    return seq - this.seqOffset();
  }

  async open(): Promise<BoxState> {
    Box.check(this);
    if (this.pImap) {
      const box = await this.pImap.openBox(this.qualifiedName);
      logger.info(`Opened ${box.name}`);

      let boxState: BoxState = !this.imapBox ? 'NEW' : 'UNCHANGED';

      if (this.imapBox && this.imapBox.uidvalidity !== box.uidvalidity) {
        logger.warn(
          `The validity of ${this.qualifiedName} has expired from ${this.imapBox.uidvalidity} to ${box.uidvalidity}`
        );

        boxState = 'UIDS_INVALID';
      }

      this.imapBox = box;

      return boxState;
    }

    return 'UNREADY';
  }

  removeMessage(message: Message | number): Message | null {
    if (typeof message === 'number') {
      const index = this.indexOf(message);
      if (index < 0 || index >= this.messages.length) {
        return null;
      }

      return this.removeMessage(this.messages[index]);
    } else {
      if (!this.hasMessage(message)) {
        return null;
      }

      delete this.msgHashes[msgHashString(message)];

      const index = this.messageList.indexOf(message);

      if (index === -1) {
        return null;
      }

      return this.messageList.splice(index, 1)[0];
    }
  }

  reset = (): void => {
    this.msgHashes = {};
    this.syncedToEpoch = 0;
  };

  subscribe = async (): Promise<void> => {
    Box.check(this);
    if (this.pImap) {
      await this.pImap.subscribeBox(this.qualifiedName);
    }
  };

  get syncedTo(): number {
    return this.syncedToEpoch;
  }

  set syncedTo(value: number) {
    this.syncedToEpoch = value;
  }

  public setSyncedToNow(): void {
    this.syncedTo = Date.now();
  }

  get uidValidity(): number | undefined {
    return _.get(this, 'box.uidvalidity');
  }
}
