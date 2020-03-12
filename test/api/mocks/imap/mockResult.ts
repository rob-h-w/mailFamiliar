import MockMessage from './mockMessage';
import ServerState from './serverState';

export interface EventHandlers {
  on: {
    [key: string]: any;
  };
  once: {
    [key: string]: any;
  };
}

export interface Simulate {
  event: {
    close: (hadError: boolean) => void;
    expunge: (seqNo: number) => void;
    mail: (count: number) => void;
    uidValidity: (validity: number) => void;
  };
  mailReceived: (mails: MockMessage[]) => Promise<void>;
}

export default interface MockResult {
  class: any;
  eventHandlers: EventHandlers;
  fetchReturnsWith: (mails: MockMessage[]) => void;
  object: any;
  setServerState: (state: ServerState) => void;
  simulate: Simulate;
}
