import {expect} from 'code';
import * as fs from 'fs';
const {afterEach, beforeEach, describe, it} = (exports.lab = require('lab').script());
import * as _ from 'lodash';
import * as mockery from 'mockery';
import * as path from 'path';
// tslint:disable-next-line: no-var-requires
const promiseRetry = require('promise-retry');
import * as sinon from 'sinon';

import mockImap, {MockResult} from './mocks/imap';

const ROOT = process.cwd();
const LOGSFOLDER = path.join(ROOT, 'logs');
const LOGPATH = path.join(LOGSFOLDER, 'mailFamiliar.log');
const SERVER = path.join(ROOT, 'src', 'index');

let fsStubs: any;
let imapMock: MockResult;

describe('folder selection', () => {
  let eventHandlers: any;
  let server: any;
  let writeStream: any;

  beforeEach(async () => {
    const dataSource = path.join(__dirname, 'fixtures', 'standard');
    const dataStorage = path.join(dataSource, 'root');
    const dataDestination = path.join(
      dataStorage,
      'd4764d8f3c61cb5d81a5326916cac5a1c2f221acc5895c508fa3e0059d927f99'
    );
    process.env.M_FAMILIAR_STORAGE = dataStorage;

    const datafiles = fs
      .readdirSync(path.join(__dirname, 'fixtures', 'standard'))
      .filter(name => name.endsWith('.json'));

    for (const dataFile of datafiles) {
      fs.copyFileSync(path.join(dataSource, dataFile), path.join(dataDestination, dataFile));
    }

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

    imapMock = mockImap(
      {
        'Family & Friends': {
          attribs: [],
          children: {},
          delimiter: '/',
          parent: null
        },
        GitHub: {
          attribs: [],
          children: {},
          delimiter: '/',
          parent: null
        },
        INBOX: {
          attribs: [],
          children: {},
          delimiter: '/',
          parent: null
        },
        'Interesting spam': {
          attribs: [],
          children: {},
          delimiter: '/',
          parent: null
        }
      },
      [
        {
          flags: [],
          messages: {
            new: 0,
            total: 1,
            unseen: 0
          },
          name: 'Family & Friends',
          newKeywords: false,
          permFlags: [],
          persistentUIDs: true,
          uidnext: 1,
          uidvalidity: 1
        },
        {
          flags: [],
          messages: {
            new: 0,
            total: 1,
            unseen: 0
          },
          name: 'GitHub',
          newKeywords: false,
          permFlags: [],
          persistentUIDs: true,
          uidnext: 1,
          uidvalidity: 1
        },
        {
          flags: [],
          messages: {
            new: 0,
            total: 1,
            unseen: 0
          },
          name: 'INBOX',
          newKeywords: false,
          permFlags: [],
          persistentUIDs: true,
          uidnext: 1,
          uidvalidity: 1
        },
        {
          flags: [],
          messages: {
            new: 0,
            total: 1,
            unseen: 0
          },
          name: 'Interesting spam',
          newKeywords: false,
          permFlags: [],
          persistentUIDs: true,
          uidnext: 1,
          uidvalidity: 1
        }
      ]
    );

    mockery.registerMock('imap', imapMock.class);

    const {startServer} = require(SERVER);

    eventHandlers = {
      on: {},
      once: {}
    };
    const serverPromise: Promise<any> = startServer();

    await promiseRetry((retry: (error: any) => never, attempt: number) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          imapMock.object.once.args.forEach((args: Array<any>) => {
            expect(args.length).to.equal(2);
            eventHandlers.once[args[0]] = args[1];
          });
          imapMock.object.on.args.forEach((args: Array<any>) => {
            expect(args.length).to.equal(2);
            eventHandlers.on[args[0]] = args[1];
          });
          if (eventHandlers.once.ready) {
            resolve();
          }
          reject(new Error('eventHandlers.once.ready not set'));
        }, 10);
      }).catch(error => {
        if (attempt < 4) {
          retry(error);
        }

        throw error;
      });
    });
    eventHandlers.once.ready();
    server = await serverPromise;
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
      });

      it('moves the mail to "Interesting Spam"', () => {
        expect(imapMock.object.move.called).to.be.true();
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
      });

      it('does not move the mail', () => {
        expect(imapMock.object.move.called).to.be.false();
      });
    });
  });
});
