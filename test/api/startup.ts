import {expect} from 'code';
const {afterEach, beforeEach, describe, it} = (exports.lab = require('lab').script());
import * as _ from 'lodash';
import * as mockery from 'mockery';
import * as path from 'path';
import * as sinon from 'sinon';

import fs, {LOGSFOLDER, M_FAMILIAR_STORAGE, MockResult as FsMock} from './mocks/fs';
import mockImap, {MockResult as ImapMock} from './mocks/imap';

const ROOT = process.cwd();
const SERVER = path.join(ROOT, 'src', 'index');

let fsMock: FsMock;
let imapMock: ImapMock;
let startServer: sinon.SinonStub;

describe('startup logging', () => {
  let server: any;

  beforeEach(() => {
    process.env.M_FAMILIAR_STORAGE = M_FAMILIAR_STORAGE;
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    fsMock = fs();
    fsMock.setup().withLog();

    mockery.registerMock('fs', fsMock.fs());

    imapMock = mockImap({}, []);
    mockery.registerMock('imap', imapMock.class);
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = null;
    }

    fsMock.teardown();

    mockery.disable();
  });

  describe('log folder creation', () => {
    beforeEach(() => {
      fsMock.fs().mkdirSync.resetBehavior();
    });

    describe('when logs exists', () => {
      beforeEach(async () => {
        ({startServer} = require(SERVER));
      });

      it('exposes a function', () => {
        expect(startServer).to.be.a.function();
      });

      it('does not create a logs folder', () => {
        expect(fsMock.fs().mkdirSync.called).to.be.false();
      });
    });

    describe('when logs does not exist', () => {
      beforeEach(async () => {
        fsMock
          .fs()
          .existsSync.withArgs(LOGSFOLDER)
          .returns(false);

        ({startServer} = require(SERVER));
      });

      it('exposes a function', () => {
        expect(startServer).to.be.a.function();
      });

      it('creates a logs folder', () => {
        expect(fsMock.fs().mkdirSync.called).to.be.true();
      });
    });
  });

  describe('startServer', () => {
    let eventHandlers: any;
    let serverPromise: Promise<any>;

    beforeEach(async () => {
      ({startServer} = require(SERVER));
      fsMock.config().withConfig();

      eventHandlers = {};

      serverPromise = startServer();

      await new Promise(resolve => {
        setTimeout(() => {
          imapMock.object.once.args.forEach((args: Array<any>) => {
            expect(args.length).to.equal(2);
            eventHandlers[args[0]] = args[1];
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

    describe('success', () => {
      beforeEach(async () => {
        eventHandlers.ready();
        server = await serverPromise;
      });

      it('returns an object', () => {
        expect(server).to.exist();
        expect(server).to.be.an.object();
      });
    });
  });
});

export {};
