import MockMessage from './mockMessage';
import ServerState from './serverState';

export default interface MockResult {
  class: any;
  fetchReturnsWith: (mails: MockMessage[]) => void;
  object: any;
  setServerState: (state: ServerState) => void;
}
