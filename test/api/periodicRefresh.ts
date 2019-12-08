import {expect} from '@hapi/code';
const {afterEach, beforeEach, describe, it} = (exports.lab = require('@hapi/lab').script());
import * as _ from 'lodash';
import * as mockery from 'mockery';
import * as sinon from 'sinon';

import bunyan, {MockResult as BunyanMock} from './mocks/bunyan';
import mockImap, {MockResult as ImapMock} from './mocks/imap';
import boxes from './tools/fixture/standard/boxes';
import {useFixture} from './tools/fixture/standard/useFixture';
import {startServerInHealthyState} from './tools/server';
import {fromBoxes} from './mocks/imap/serverState';
import {mockStorageAndSetEnvironment} from './mocks/mailFamiliarStorage';
import {until} from './tools/wait';

let bunyanMock: BunyanMock;
let imapMock: ImapMock;

describe('periodic refresh', () => {
  let clock: sinon.SinonFakeTimers;
  let server: any;

  beforeEach(async () => {
    await useFixture();

    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    mockStorageAndSetEnvironment();

    bunyanMock = bunyan();
    mockery.registerMock('bunyan', bunyanMock.object);

    imapMock = mockImap();
    imapMock.setServerState(fromBoxes(boxes));

    mockery.registerMock('imap', imapMock.class);

    clock = sinon.useFakeTimers({
      now: 1547375767863,
      shouldAdvanceTime: true
    });
    ({server} = await startServerInHealthyState(imapMock));
  });

  afterEach(async () => {
    clock.restore();

    if (server) {
      await server.stop();
      server = null;
    }

    mockery.disable();
  });

  describe('when an hour has passed', () => {
    beforeEach(async () => {
      imapMock.object.openBox.reset();
      clock.tick('01:00:00');

      // Hack because we don't have the ability to wait explicitly for all the calls to complete without
      // exposing more of the internals.
      await until(() => imapMock.object.openBox.callCount >= 4);
    });

    it('refreshes other mailboxes in case the message was moved, then reopens INBOX', () => {
      const boxenNames = imapMock.object.openBox.getCalls().map((call: any) => call.args[0]);
      expect(boxenNames).to.include(['Family & Friends', 'GitHub', 'INBOX', 'Interesting spam']);
      // 4 mailboxes and then INBOX again.
      expect(imapMock.object.openBox.callCount).to.equal(5);
    });
  });
});
