import {expect} from '@hapi/code';
import * as fs from 'fs';
const {afterEach, beforeEach, describe, it} = (exports.lab = require('@hapi/lab').script());
import * as _ from 'lodash';
import * as mockery from 'mockery';
import * as path from 'path';
import {stub, SinonStub} from 'sinon';

import mockImap, {MockResult as ImapMock} from './mocks/imap';
import {mockStorageAndSetEnvironment, MockResult as StorageMock} from './mocks/mailFamiliarStorage';
import {until, waitATick} from './tools/wait';

const ROOT = process.cwd();
const SERVER = path.join(ROOT, 'src', 'index');

let imapMock: ImapMock;
let startServer: sinon.SinonStub;
let storageMock: StorageMock;

let server: any;

class BadProtocol extends Error {
  source: string;
  type: string;

  constructor() {
    super();
    this.source = 'protocol';
    this.type = 'bad';
  }
}

beforeEach(() => {
  mockery.enable({
    useCleanCache: true,
    warnOnReplace: false,
    warnOnUnregistered: false
  });

  storageMock = mockStorageAndSetEnvironment();

  imapMock = mockImap();
  mockery.registerMock('imap', imapMock.class);

  stub(process, 'on');
});

afterEach(async () => {
  if (server) {
    await server.stop();
    server = null;
  }

  mockery.disable();

  ((process.on as unknown) as sinon.SinonStub).restore();
});

describe('startup', () => {
  describe('startServer', () => {
    let uncaughtException: (reason: Error) => void;
    let unhandledRejection: (reason: Error) => void;
    let eventHandlers: any;
    let serverPromise: Promise<any>;

    beforeEach(async () => {
      ({startServer} = require(SERVER));

      eventHandlers = {};

      serverPromise = startServer();

      await new Promise(resolve => {
        setTimeout(() => {
          imapMock.object.once.args.forEach((args: Array<any>) => {
            expect(args.length).to.equal(2);
            eventHandlers[args[0]] = args[1];
          });
          const on: SinonStub = (process.on as unknown) as SinonStub;
          on.getCalls().forEach(call => {
            if (call.args.length) {
              if (call.args[0] === 'uncaughtException') {
                uncaughtException = call.args[1];
              }
              if (call.args[0] === 'unhandledRejection') {
                unhandledRejection = call.args[1];
              }
            }
          });
          resolve();
        }, 10);
      });
    });

    it('registers an error handler', () => {
      expect(eventHandlers.error).to.be.a.function();
    });

    it('registers a ready handler', () => {
      expect(eventHandlers.ready).to.be.a.function();
    });

    it('registers an uncaught exception handler', () => {
      expect(uncaughtException).to.exist();
    });

    it('registers an unhandled rejection handler', () => {
      expect(unhandledRejection).to.exist();
    });

    describe('success', () => {
      beforeEach(async () => {
        await until(() => _.isFunction(eventHandlers.ready));
        eventHandlers.ready();
        server = await serverPromise;
      });

      it('returns an object', () => {
        expect(server).to.exist();
        expect(server).to.be.an.object();
      });

      describe('then', () => {
        const badProtocol = new BadProtocol();

        const cases = [
          {
            error: new Error(),
            kills: true,
            name: 'general uncaught exception',
            uncaught: true
          },
          {
            error: new Error(),
            kills: true,
            name: 'general unhandled rejection',
            uncaught: false
          },
          {
            error: badProtocol,
            kills: false,
            name: 'uncaught bad protocol error',
            uncaught: true
          },
          {
            error: badProtocol,
            kills: false,
            name: 'unhandled bad protocol error',
            uncaught: false
          }
        ];

        beforeEach(async () => {
          stub(process, 'exit');
        });

        afterEach(() => {
          ((process.exit as unknown) as sinon.SinonStub).restore();
        });

        cases.forEach(c => {
          describe(c.name, () => {
            beforeEach(async () => {
              if (c.uncaught) {
                uncaughtException(c.error);
              } else {
                unhandledRejection(c.error);
              }
              await new Promise(resolve => setTimeout(resolve, 20));
            });

            if (c.kills) {
              it('kills the process', () => {
                expect(((process.exit as unknown) as sinon.SinonStub).called).to.be.true();
              });
            } else {
              it('does not kill the process', () => {
                expect(((process.exit as unknown) as sinon.SinonStub).called).to.be.false();
              });
            }
          });
        });
      });
    });
  });
});

describe('startup logging', () => {
  describe('log folder creation', () => {
    let oldLogFile: string | undefined;

    beforeEach(() => {
      oldLogFile = process.env.LOG_FILE;
      process.env.LOG_FILE = path.join(storageMock.root, 'logs', 'my.log');
    });

    afterEach(() => {
      process.env.LOG_FILE = oldLogFile;
    });

    describe('when logs exists', () => {
      beforeEach(async () => {
        ({startServer} = require(SERVER));
      });

      it('exposes a function', () => {
        expect(startServer).to.be.a.function();
      });
    });

    describe('when logs does not exist', () => {
      let logsPath: string;

      beforeEach(async () => {
        logsPath = path.join(storageMock.root, 'logs');
        if (fs.existsSync(logsPath)) {
          fs.rmdirSync(logsPath);
        }
        ({startServer} = require(SERVER));
        await waitATick();
      });

      it('creates a logs folder', () => {
        expect(fs.existsSync(logsPath)).to.be.true();
      });
    });
  });
});

export {};
