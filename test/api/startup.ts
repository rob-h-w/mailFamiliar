import { expect } from 'code';
import * as fs from 'fs';
const { afterEach, beforeEach, describe, it } = exports.lab = require('lab').script();
import * as _ from 'lodash';
import * as mockery from 'mockery';
import * as path from 'path';
import * as sinon from 'sinon';

const ROOT = process.cwd();
const LOGSFOLDER = path.join(ROOT, 'logs');
const LOGPATH = path.join(LOGSFOLDER, 'mailFamiliar.log');
const SERVER = path.join(ROOT, 'src', 'index');

let fsStubs: any;
let imap: Function;
let imapObj: any;
let startServer: Function;

process.env.M_FAMILIAR_STORAGE = '/storage';

const USER_PATH = path.join(process.env.M_FAMILIAR_STORAGE, 'user.json');
const USER_SETTINGS = {
  user: 'rob@example.com',
  password: '123',
  host: 'imap.example.com',
  port: 143,
  tls: true
};

describe('startup logging', () => {
  let server;
  let writeStream;

  beforeEach(() => {
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    fsStubs = sinon.stub(fs);
    _.functions(fsStubs).forEach((f) => {
      fsStubs[f].callThrough();
    });

    fsStubs.existsSync.withArgs(LOGSFOLDER).returns(true);

    writeStream = {
      end: sinon.stub().returns(false),
      write: sinon.stub().callsFake((...args) => {
        console.log(...args);
      })
    };

    fsStubs.createWriteStream.withArgs(
      LOGPATH,
      {
        flags: 'a', encoding: 'utf8'
      }).returns(writeStream);

    mockery.registerMock('fs', fsStubs);

    imapObj = {
      connect: sinon.stub(),
      getBoxes: sinon.stub(),
      once: sinon.stub()
    };
    imap = sinon.stub().returns(imapObj);
    mockery.registerMock('imap', imap);
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = null;
    }

    _.functions(fsStubs).forEach((f) => {
      fsStubs[f].restore();
    });

    mockery.disable();
  });

  describe('log folder creation', () => {
    beforeEach(() => {
      fsStubs.mkdirSync.resetBehavior();
    });

    describe('when logs exists', () => {
      beforeEach(async () => {
        ({ startServer } = require(SERVER));
      });

      it('exposes a function', () => {
        expect(startServer).to.be.a.function();
      });

      it('does not create a logs folder', () => {
        expect(fsStubs.mkdirSync.called).to.be.false();
      });
    });

    describe('when logs does not exist', () => {
      beforeEach(async () => {
        fsStubs.existsSync.withArgs(LOGSFOLDER).returns(false);

        ({ startServer } = require(SERVER));
      });

      it('exposes a function', () => {
        expect(startServer).to.be.a.function();
      });

      it('creates a logs folder', () => {
        expect(fsStubs.mkdirSync.called).to.be.true();
      });
    });
  });

  describe('startServer', () => {
    let eventHandlers;
    let serverPromise: Promise<any>;

    beforeEach(async () => {
      ({ startServer } = require(SERVER));

      fsStubs.readdir.callsFake((path, callback) => {
        if (path === process.env.M_FAMILIAR_STORAGE) {
          callback(null, ['user.json']);
        } else {
          return fs.readdir(path, callback);
        }
      });

      fsStubs.readFileSync.withArgs(USER_PATH).returns(JSON.stringify(USER_SETTINGS));

      eventHandlers = {};

      serverPromise = startServer();

      await new Promise((resolve) => {
        setTimeout(
          () => {
            imapObj.once.args.forEach((args) => {
              expect(args.length).to.equal(2);
              eventHandlers[args[0]] = args[1];
            });
            resolve();
          },
          10);
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

export{};
