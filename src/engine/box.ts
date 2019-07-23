import * as Imap from 'imap';
import * as _ from 'lodash';
import {Literal, Static, Union} from 'runtypes';

import Promisified from '../imap/promisified';
import logger from '../logger';
import {IMessage} from './message';

interface IBoxRequired {
  name: string;
  qualifiedName: string;
  syncedTo: number;
}

export interface IBoxPersisted extends IBoxRequired {
  box?: Imap.Box;
  messages?: ReadonlyArray<IMessage>;
}

interface IBox extends IBoxPersisted {
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

function msgHashString(message: IMessage): string {
  return `${message.date}${message.seq}${message.uid}`;
}

export default class Box {
  private imapBox?: Imap.Box;
  private imapFolder?: Imap.Folder;
  private msgHashes: {
    [key: string]: IMessage;
  };
  private pImap?: Promisified;
  private syncedToEpoch: number;

  readonly name: string;
  readonly qualifiedName: string;

  private static check(box: Box) {
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

  constructor({box, imapFolder, messages, name, pImap, qualifiedName, syncedTo}: IBox) {
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
    }
  }

  addMessage = (message: IMessage) => {
    if (this.hasMessage(message)) {
      return;
    }

    this.addMessageHash(message);
    this.syncedToEpoch = Math.max(this.syncedToEpoch, message.date.getTime());
  };

  private addMessageHash = (message: IMessage) => {
    this.msgHashes[msgHashString(message)] = message;
  };

  get box() {
    return this.imapBox;
  }

  private hasMessage = (message: IMessage): boolean => {
    const hashString = msgHashString(message);
    return !!this.msgHashes[hashString];
  };

  get isInbox(): boolean {
    return Box.isInbox(this.qualifiedName);
  }

  mergeFrom(box: Box) {
    if (box.qualifiedName !== this.qualifiedName) {
      throw new Error(`Attempt to merge ${box.qualifiedName} into ${this.qualifiedName}`);
    }

    this.imapFolder = this.imapFolder || box.imapFolder;
    Object.assign(this.msgHashes, box.msgHashes);
    this.pImap = this.pImap || box.pImap;
    this.syncedToEpoch = Math.max(box.syncedToEpoch, this.syncedToEpoch);

    Box.check(this);
  }

  get messages(): ReadonlyArray<IMessage> {
    return Object.values(this.msgHashes);
  }

  open = async (): Promise<BoxState> => {
    Box.check(this);
    if (this.pImap) {
      const box = await this.pImap.openBox(this.qualifiedName);
      logger.info(`Opened ${this.qualifiedName}`);

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
  };

  removeMessage = (message: IMessage) => {
    if (!this.hasMessage(message)) {
      return;
    }

    delete this.msgHashes[msgHashString(message)];
  };

  reset = () => {
    this.msgHashes = {};
    this.syncedToEpoch = 0;
  };

  subscribe = async () => {
    Box.check(this);
    if (this.pImap) {
      await this.pImap.subscribeBox(this.qualifiedName);
    }
  };

  get syncedTo() {
    return this.syncedToEpoch;
  }

  set syncedTo(value: number) {
    this.syncedToEpoch = value;
  }

  public setSyncedToNow() {
    this.syncedTo = Date.now();
  }

  get uidValidity(): number | undefined {
    return _.get(this, 'box.uidvalidity');
  }
}
