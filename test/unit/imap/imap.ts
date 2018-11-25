import {expect} from 'code';
const {afterEach, beforeEach, describe, it} = (exports.lab = require('lab').script());
import * as mockery from 'mockery';
import * as sinon from 'sinon';

const parameters = {
  host: 'imap.example.com',
  password: '123',
  port: 143,
  tls: true,
  user: 'rob@example.com'
};

let Imap: any;
let ImapImpl: any;
let imapImpl: any;
let logger: any;

describe('imap', () => {
  beforeEach(() => {
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    imapImpl = {
      connect: sinon.stub(),
      getBoxes: sinon.stub(),
      once: sinon.stub()
    };
    ImapImpl = sinon.stub().returns(imapImpl);
    logger = {
      debug: sinon.stub(),
      error: sinon.stub(),
      info: sinon.stub(),
      warn: sinon.stub()
    };

    mockery.registerMock('imap', ImapImpl);
    mockery.registerMock('../logger', {default: logger});

    Imap = require('../../../src/imap/imap').default;
  });

  afterEach(() => {
    mockery.disable();
  });

  it('exposes a class', () => {
    expect(Imap).to.exist();
    expect(Imap).to.be.a.function();
  });

  describe('new instance', () => {
    let imap: any;
    let imapEvents: any;

    beforeEach(() => {
      imap = new Imap(parameters);
      imapEvents = {};
      imapImpl.once.args.map((array: any) => {
        imapEvents[array[0]] = array[1];
      });
    });

    it('instantiates an imap object', () => {
      expect(imap).to.exist();
      expect(ImapImpl.calledOnce).to.be.true();
      expect(ImapImpl.firstCall.args).to.equal([parameters]);
    });

    it('sets the error callback', () => {
      expect(Object.keys(imapEvents)).to.contain('error');
    });

    it('sets the ready callback', () => {
      expect(Object.keys(imapEvents)).to.contain('ready');
    });

    it('does not warn', () => {
      expect(logger.warn.called).to.be.false();
    });

    describe('uninitialized throws on', () => {
      it('get mailboxes', () => {
        expect(() => {
          // tslint:disable-next-line:no-unused-expression
          imap.mailBoxes;
        }).to.throw();
      });
    });

    describe('init', () => {
      let imapInitPromise: Promise<void>;
      let error: Error;

      beforeEach(() => {
        error = new Error();
        imapInitPromise = imap.init();
      });

      it('tries to connect', () => {
        expect(imapImpl.connect.calledOnce).to.be.true();
      });

      it("warns that there's no handler on subsequent ready event", () => {
        imapEvents.ready();
        expect(logger.warn.called).to.be.false();
      });

      describe('failing', () => {
        let rejection: any;

        describe('connection', () => {
          beforeEach(() => {
            imapInitPromise.catch(e => {
              rejection = e;
            });
            imapEvents.error(error);
          });

          it('rejects the init promise', () => {
            expect(rejection).to.equal(error);
          });
        });
      });

      describe('success', () => {
        const boxes = {
          INBOX: {
            attribs: ['\\HasNoChildren'],
            children: null,
            delimiter: '/',
            parent: null
          }
        };

        beforeEach(async () => {
          imapImpl.getBoxes.callsFake((callback: (err: Error | null, boxes: any) => void) => {
            callback(null, boxes);
          });

          imapEvents.ready();
          await imapInitPromise;
          imapImpl.getBoxes.firstCall.args[0](null, boxes);
        });

        it('lists the mailboxes for the user', () => {
          expect(imapImpl.getBoxes.called).to.be.true();
        });

        it("exposes the user's mailboxes", () => {
          expect(imap.mailBoxes).to.equal(boxes);
        });
      });

      describe('edge cases (should never happen)', () => {
        beforeEach(() => {
          imapEvents.ready();
        });

        it("warns that there's no handler on subsequent ready event", () => {
          imapEvents.ready();
          expect(logger.warn.called).to.be.true();
        });

        it("warns that there's no error handler on subsequent error", () => {
          imapEvents.error(error);
          expect(logger.warn.called).to.be.true();
        });
      });
    });
  });
});

export {};
