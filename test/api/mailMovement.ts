import {expect} from 'code';
const {afterEach, beforeEach, describe, it} = (exports.lab = require('lab').script());
import * as _ from 'lodash';
import * as mockery from 'mockery';
import * as sinon from 'sinon';

import mockImap, {MockResult as ImapMock} from './mocks/imap';
import boxes from './tools/fixture/standard/boxes';
import bunyan, {MockResult as BunyanMock} from './mocks/bunyan';
import {useFixture} from './tools/fixture/standard/useFixture';
import {EventHandlers, startServerInHealthyState} from './tools/server';
import {fromBoxes} from './mocks/imap/serverState';
import {mockStorageAndSetEnvironment} from './mocks/mailFamiliarStorage';
import {until} from './tools/wait';

let bunyanMock: BunyanMock;
let clock: sinon.SinonFakeTimers;
let imapMock: ImapMock;

describe('mail movement', () => {
  let eventHandlers: EventHandlers;
  let server: any;

  beforeEach(async () => {
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    clock = sinon.useFakeTimers({
      now: new Date('2019-01-01T00:00:00.000Z'),
      shouldAdvanceTime: true
    });

    bunyanMock = bunyan();

    mockery.registerMock('bunyan', bunyanMock.object);

    await useFixture();

    mockStorageAndSetEnvironment();

    imapMock = mockImap();
    const inbox = [
      {
        attributes: {
          date: new Date('2018-12-25T12:21:37.000Z'),
          flags: [],
          size: 1234,
          uid: 40465
        },
        body: Buffer.from("This goes in the buffer. It's buffer food. Nomnom."),
        seqno: 40465,
        synced: true
      }
    ];
    const serverState = fromBoxes(boxes);
    const inboxState = serverState.folders.INBOX;
    inboxState.messages = inbox;
    inboxState.messageState.total = inbox.length;

    imapMock.setServerState(serverState);

    mockery.registerMock('imap', imapMock.class);

    ({eventHandlers, server} = await startServerInHealthyState(imapMock));
    await until(() => bunyanMock.logger.info.calledWith(`shallow sync complete`));
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = null;
    }

    clock.restore();
    mockery.disable();
  });

  it('ends up with INBOX open', () => {
    const openBox = imapMock.object.openBox;
    expect(openBox.called).to.be.true();
    const lastCall = openBox.lastCall;
    expect(lastCall.args[0]).to.equal('INBOX');
  });

  describe('when a mail from the opened mailbox is expunged', () => {
    beforeEach(async () => {
      imapMock.object.openBox.reset();
      bunyanMock.logger.info.reset();
      await eventHandlers.on.expunge(40465);
      await until(() => bunyanMock.logger.info.calledWith(`shallow sync complete`));
    });

    it('refreshes other mailboxes in case the message was moved', () => {
      const boxenNames = imapMock.object.openBox.getCalls().map((call: any) => call.args[0]);
      expect(boxenNames).to.include(['Family & Friends', 'GitHub', 'Interesting spam']);
    });
  });
});
