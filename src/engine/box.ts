import * as Imap from 'imap';
import {Literal, Static, Union} from 'runtypes';

import AdjacencyTable, {IAdjacencyTable} from './adjacencyTable';
import Promisified from '../imap/promisified';
import logger from '../logger';
import {IMessage} from './message';

interface IBoxRequired {
  adjacencyTable: IAdjacencyTable;
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

export default class Box {
  private aTable: AdjacencyTable;
  private imapBox?: Imap.Box;
  private imapFolder?: Imap.Folder;
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

  constructor({
    adjacencyTable,
    box,
    imapFolder,
    messages,
    name,
    pImap,
    qualifiedName,
    syncedTo
  }: IBox) {
    this.aTable = new AdjacencyTable(adjacencyTable);
    this.imapBox = box;
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
    this.syncedToEpoch = Math.max(this.syncedToEpoch, message.date.getTime());
    this.aTable.addAdjacencyTable(message.engineState.adjacencyTable.raw);
  };

  get adjacencyTable() {
    return this.aTable.raw;
  }

  get box() {
    return this.imapBox;
  }

  get isInbox(): boolean {
    return this.qualifiedName.toUpperCase() === 'INBOX';
  }

  confidenceFor = (str: string): number => {
    return this.aTable.confidenceFor(str);
  };

  mailboxChange = () => {};

  get messages(): ReadonlyArray<IMessage> {
    return this.msgs;
  }

  open = async (): Promise<BoxState> => {
    Box.check(this);
    if (this.pImap) {
      const box = await this.pImap.openBox(this.qualifiedName);
      logger.info(`Opened ${JSON.stringify(box)}`);

      let boxState: BoxState = !this.imapBox ? 'NEW' : 'UNCHANGED';

      if (this.imapBox && this.imapBox.uidvalidity !== box.uidvalidity) {
        logger.warn(
          `The validity of ${this.qualifiedName} has expired from ${this.imapBox.uidvalidity} to ${
            box.uidvalidity
          }`
        );

        boxState = 'UIDS_INVALID';

        // TODO Handle re-syncing messages.
      }

      this.imapBox = box;

      return boxState;
    }

    return 'UNREADY';
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

    this.aTable.addAdjacencyTable(box.adjacencyTable);
    this.imapFolder = this.imapFolder || box.imapFolder;
    this.pImap = this.pImap || box.pImap;
    this.syncedToEpoch = Math.max(box.syncedToEpoch, this.syncedToEpoch);

    Box.check(this);
  }
}
