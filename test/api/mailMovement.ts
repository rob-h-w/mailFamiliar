import {expect} from 'code';
const {afterEach, beforeEach, describe, it} = (exports.lab = require('lab').script());
import * as _ from 'lodash';
import * as mockery from 'mockery';

import mockImap, {MockResult as ImapMock} from './mocks/imap';
import boxes from './tools/fixture/standard/boxes';
import {useFixture} from './tools/fixture/standard/useFixture';
import {EventHandlers, startServerInHealthyState} from './tools/server';
import {fromBoxes} from './mocks/imap/serverState';
import {mockStorageAndSetEnvironment} from './mocks/mailFamiliarStorage';

let imapMock: ImapMock;

describe('mail movement', () => {
  let eventHandlers: EventHandlers;
  let server: any;

  beforeEach(async () => {
    await useFixture();

    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    mockStorageAndSetEnvironment();

    imapMock = mockImap();
    imapMock.setServerState(fromBoxes(boxes));

    mockery.registerMock('imap', imapMock.class);

    ({eventHandlers, server} = await startServerInHealthyState(imapMock));
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = null;
    }

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
      await eventHandlers.on.expunge(40465);
    });

    it('refreshes other mailboxes in case the message was moved', () => {
      const boxenNames = imapMock.object.openBox.getCalls().map((call: any) => call.args[0]);
      expect(boxenNames).to.include(['Family & Friends', 'GitHub', 'Interesting spam']);
    });
  });
});
