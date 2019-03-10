import {expect} from 'code';
import * as fs from 'fs';
const {afterEach, beforeEach, describe, it} = (exports.lab = require('lab').script());
import * as _ from 'lodash';
import * as mockery from 'mockery';
import * as path from 'path';
import * as sinon from 'sinon';

import mockImap, {MockResult} from './mocks/imap';
import boxes from './tools/fixture/standard/boxes';
import mailBoxes from './tools/fixture/standard/mailBoxes';
import {useFixture} from './tools/fixture/standard/useFixture';
import {EventHandlers, startServerInHealthyState} from './tools/server';

const ROOT = process.cwd();
const LOGSFOLDER = path.join(ROOT, 'logs');
const LOGPATH = path.join(LOGSFOLDER, 'mailFamiliar.log');

let fsStubs: any;
let imapMock: MockResult;

describe('mail movement', () => {
  let eventHandlers: EventHandlers;
  let server: any;
  let writeStream: any;

  beforeEach(async () => {
    await useFixture();

    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    fsStubs = sinon.stub(fs);
    _.functions(fsStubs).forEach(f => {
      fsStubs[f].callThrough();
    });

    fsStubs.existsSync.withArgs(LOGSFOLDER).returns(true);

    writeStream = {
      end: sinon.stub().returns(false),
      write: sinon.stub().callsFake((...args) => {
        // tslint:disable-next-line:no-console
        console.log(...args);
      })
    };

    fsStubs.createWriteStream
      .withArgs(LOGPATH, {
        encoding: 'utf8',
        flags: 'a'
      })
      .returns(writeStream);

    mockery.registerMock('fs', fsStubs);

    imapMock = mockImap(mailBoxes, boxes);

    mockery.registerMock('imap', imapMock.class);

    ({eventHandlers, server} = await startServerInHealthyState(imapMock));
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = null;
    }

    _.functions(fsStubs).forEach(f => {
      fsStubs[f].restore();
    });

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
