import * as Imap from 'imap';

import Promisified from '../imap/promisified';
import ILastMessage from './lastMessage';
import logger from '../logger';
import {IMessage} from './message';

interface IBoxRequired {
  name: string;
  qualifiedName: string;
  syncedTo: number;
}

export interface IBoxPersisted extends IBoxRequired {
  messages?: ReadonlyArray<IMessage>;
}

interface IBox extends IBoxPersisted {
  imapFolder?: Imap.Folder;
  pImap?: Promisified;
}

export default class Box {
  private imapFolder?: Imap.Folder;
  private lMessage?: ILastMessage;
  private msgs: IMessage[];
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

  constructor({imapFolder, messages, name, pImap, qualifiedName, syncedTo}: IBox) {
    this.imapFolder = imapFolder;
    this.name = name;
    this.msgs = [];
    this.pImap = pImap;
    this.qualifiedName = qualifiedName;
    this.syncedToEpoch = syncedTo;

    if (messages) {
      this.msgs = this.msgs.concat(...messages);
    }
  }

  addMessage = (message: IMessage) => {
    this.msgs.push(message);
    this.syncedToEpoch = Math.max(this.syncedToEpoch, message.envelope.date.getTime());
  };

  get isInbox(): boolean {
    return this.qualifiedName.toUpperCase() === 'INBOX';
  }

  get lastMessage(): ILastMessage | undefined {
    return this.lMessage;
  }

  mailboxChange = () => {};

  get messages(): ReadonlyArray<IMessage> {
    return this.msgs;
  }

  open = async () => {
    Box.check(this);
    if (this.pImap) {
      const box = await this.pImap.openBox(this.qualifiedName);
      logger.info(box);
    }
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

  mergeFrom(box: Box) {
    if (box.qualifiedName !== this.qualifiedName) {
      throw new Error(`Attempt to merge ${box.qualifiedName} into ${this.qualifiedName}`);
    }

    this.imapFolder = this.imapFolder || box.imapFolder;
    this.pImap = this.pImap || box.pImap;
    this.syncedToEpoch = Math.max(box.syncedToEpoch, this.syncedToEpoch);

    Box.check(this);
  }
}
