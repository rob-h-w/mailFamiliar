import {expect} from '@hapi/code';
const {
  after,
  afterEach,
  before,
  beforeEach,
  describe,
  it,
} = (exports.lab = require('@hapi/lab').script());
import * as mockery from 'mockery';
import * as sinon from 'sinon';

import {Box} from 'imap';

import bunyan, {MockResult as BunyanMock} from './mocks/bunyan';
import mockImap from './mocks/imap';
import ImapMock from './mocks/imap/mockResult';
import ServerState, {fromBoxes} from './mocks/imap/serverState';
import {mockStorageAndSetEnvironment} from './mocks/mailFamiliarStorage';
import boxes from './tools/fixture/standard/boxes';
import {useFixture} from './tools/fixture/standard/useFixture';
import {startServerInHealthyState} from './tools/server';
import stubExit from './tools/stubExit';
import {until} from './tools/wait';

let bunyanMock: BunyanMock;
let clock: sinon.SinonFakeTimers;
let imapMock: ImapMock;

const INBOX = 'INBOX';
const INTERESTING_SPAM = 'Interesting spam';

stubExit(before, after);

describe('folder', () => {
  const inbox = [
    {
      attributes: {
        date: new Date('2018-12-25T12:21:37.000Z'),
        flags: [],
        size: 1234,
        uid: 41,
      },
      body: Buffer.from('whut up?'),
      seqno: 41,
      synced: true,
    },
  ];
  const interestingSpam = [
    {
      attributes: {
        date: new Date('2018-12-26T01:09:55.000Z'),
        flags: [],
        size: 15711,
        uid: 68,
      },
      body: Buffer.from('interesting spam like this'),
      seqno: 68,
      synced: true,
    },
  ];

  let server: any;
  let serverState: ServerState;

  beforeEach(async () => {
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false,
    });

    clock = sinon.useFakeTimers({
      now: new Date('2019-01-01T00:00:00.000Z'),
      shouldAdvanceTime: true,
    });

    bunyanMock = bunyan();

    mockery.registerMock('bunyan', bunyanMock.object);

    await useFixture();

    mockStorageAndSetEnvironment();

    imapMock = mockImap();
    serverState = fromBoxes(boxes);
    const inboxState = serverState.folders.INBOX;
    inboxState.messages = inbox;
    inboxState.messageState.total = inbox.length;
    const interestingSpamState = serverState.folders[INTERESTING_SPAM];
    interestingSpamState.messages = interestingSpam;
    interestingSpamState.messageState.total = interestingSpam.length;

    imapMock.setServerState(serverState);

    mockery.registerMock('imap', imapMock.class);

    server = await startServerInHealthyState();
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

  describe('deletion', () => {
    beforeEach(async () => {
      const newBoxes: Box[] = [];
      boxes.filter((box) => box.name !== INTERESTING_SPAM).forEach((box) => newBoxes.push(box));
      const newState = fromBoxes(newBoxes);
      newState.currentlyOpenBox = INBOX;
      imapMock.setServerState(newState);
      imapMock.object.getBoxes.reset();
      bunyanMock.logger.info.reset();
      clock.tick('01:00:00');
      await until(() => bunyanMock.logger.info.calledWith('shallow sync complete'));
    });

    it('discovers the folders again', () => {
      expect(imapMock.object.getBoxes.called).to.be.true();
    });
  });
});
