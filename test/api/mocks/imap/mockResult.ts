import MockMessage from './mockMessage';
import ServerState from './serverState';
import {EventHandlers} from '../../tools/server';

export default interface MockResult {
  class: any;
  fetchReturnsWith: (mails: MockMessage[]) => void;
  object: any;
  setServerState: (state: ServerState) => void;
  simulateMailReceived: (mails: MockMessage[], handlers: EventHandlers) => Promise<void>;
}
