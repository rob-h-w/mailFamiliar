import MockMessage from './mockMessage';
import ServerState from './serverState';
import {EventHandlers} from '../../tools/server';

export interface Simulate {
  event: {
    close: (hadError: boolean) => void;
    expunge: (seqNo: number) => void;
    mail: (count: number) => void;
    uidValidity: (validity: number) => void;
  };
  mailReceived: (mails: MockMessage[], handlers: EventHandlers) => Promise<void>;
}

export default interface MockResult {
  class: any;
  fetchReturnsWith: (mails: MockMessage[]) => void;
  object: any;
  setServerState: (state: ServerState) => void;
  simulate: Simulate;
}
