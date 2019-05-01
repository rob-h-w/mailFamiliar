import {expect} from 'code';
const {afterEach, beforeEach, describe, it} = (exports.lab = require('lab').script());
import * as _ from 'lodash';
import * as mockery from 'mockery';
import * as sinon from 'sinon';

import fs, {MockResult as FsMock} from './mocks/fs';
import mockImap, {MockResult as ImapMock} from './mocks/imap';
import boxes from './tools/fixture/standard/boxes';
import mailBoxes from './tools/fixture/standard/mailBoxes';
import {useFixture} from './tools/fixture/standard/useFixture';
import {startServerInHealthyState} from './tools/server';

let fsMock: FsMock;
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

    fsMock = fs();
    fsMock.setup().withLog();

    mockery.registerMock('fs', fsMock.fs());

    imapMock = mockImap(mailBoxes, boxes);

    mockery.registerMock('imap', imapMock.class);

    clock = sinon.useFakeTimers({shouldAdvanceTime: true});
    ({server} = await startServerInHealthyState(imapMock));
  });

  afterEach(async () => {
    clock.restore();

    if (server) {
      await server.stop();
      server = null;
    }

    fsMock.teardown();

    mockery.disable();
  });

  describe('when an hour has passed', () => {
    beforeEach(async () => {
      imapMock.object.openBox.reset();
      clock.tick('01:00:00');

      // Hack because we don't have the ability to wait explicitly for all the calls to complete without
      // exposing more of the internals.
      while (imapMock.object.openBox.callCount < 4) {
        await new Promise(resolve => {
          setTimeout(resolve, 0);
        });
      }
    });

    it('refreshes other mailboxes in case the message was moved, then reopens INBOX', () => {
      const boxenNames = imapMock.object.openBox.getCalls().map((call: any) => call.args[0]);
      expect(boxenNames).to.include(['Family & Friends', 'GitHub', 'INBOX', 'Interesting spam']);
      expect(imapMock.object.openBox.callCount).to.equal(4);
    });
  });
});
