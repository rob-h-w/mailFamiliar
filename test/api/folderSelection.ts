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

function waitATick() {
  return new Promise(resolve => {
    setTimeout(resolve, 0);
  });
}

describe('folder selection', () => {
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

  it('spins up', () => {
    expect(server).to.exist();
  });

  describe("when there's already mail", () => {
    const mail = [
      {
        attrs: {
          date: new Date('2018-12-26T01:09:55.000Z'),
          size: 15711,
          uid: 68
        },
        body: 'interesting spam like this',
        seqno: 68
      },
      {
        attrs: {
          date: new Date('2018-12-27T00:47:48.000Z'),
          size: 3688,
          uid: 69
        },
        body: 'interesting spam like that',
        seqno: 69
      },
      {
        attrs: {
          date: new Date('2018-12-27T12:48:50.000Z'),
          size: 3655,
          uid: 70
        },
        body: 'interesting spam like this',
        seqno: 70
      }
    ];

    beforeEach(() => {
      imapMock.object.search.callsArgWith(1, null, mail.map(msg => msg.attrs.uid));
    });

    it('spins up', () => {
      expect(server).to.exist();
    });

    describe('when a new mail comes in that matches', () => {
      beforeEach(async () => {
        imapMock.fetchReturnsWith([
          {
            attributes: {
              date: new Date(),
              flags: [],
              uid: 32
            },
            body: Buffer.from('interesting spam like the others'),
            seqno: 1
          }
        ]);
        await eventHandlers.on.mail(1);
        await waitATick();
      });

      it('moves the mail', () => {
        expect(imapMock.object.move.called).to.be.true();
      });

      it('moves the mail to "Interesting spam"', () => {
        expect(imapMock.object.move.args[0][1]).to.equal('Interesting spam');
      });
    });

    describe('when a new mail comes in that does not match', () => {
      beforeEach(async () => {
        imapMock.fetchReturnsWith([
          {
            attributes: {
              date: new Date(),
              flags: [],
              uid: 32
            },
            body: Buffer.from("what's this now?"),
            seqno: 2
          }
        ]);
        await eventHandlers.on.mail(1);
        await waitATick();
      });

      it('does not move the mail', () => {
        expect(imapMock.object.move.called).to.be.false();
      });
    });
  });
});
