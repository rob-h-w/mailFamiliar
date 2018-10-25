const { expect } = require('code');
const { afterEach, beforeEach, describe, it } = exports.lab = require('lab').script();
const mockery = require('mockery');
const sinon = require('sinon');

const parameters = {
  user: 'rob@example.com',
  password: '123',
  host: 'imap.example.com',
  port: 143,
  tls: true
};

let Imap;
let ImapImpl;
let imapImpl;
let logger;

describe('imap', () => {
  beforeEach(() => {
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false
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
    mockery.registerMock('../logger', { default: logger });

    mockery.registerAllowable('../../../src/imap/imap');

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
    let imap;
    let imapEvents;

    beforeEach(() => {
      imap = new Imap(parameters);
      imapEvents = {};
      imapImpl.once.args.map(array => {
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
          imap.mailBoxes;
        }).to.throw();
      });
    });

    describe('init', () => {
      let imapInitPromise:Promise<void>;
      let error: Error;

      beforeEach(() => {
        error = new Error();
        imapInitPromise = imap.init();
      });

      it('tries to connect', () => {
        expect(imapImpl.connect.calledOnce).to.be.true();
      })

      it('warns that there\'s no handler on subsequent ready event', () => {
        imapEvents.ready();
        expect(logger.warn.called).to.be.false();
      });

      describe('failing', () => {
        let rejection;

        describe('connection', () => {
          beforeEach(() => {
            imapInitPromise.catch((e) => {
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
            attribs: [ '\\HasNoChildren' ],
            children: null,
            delimiter: '/',
            parent: null
          }
        };

        beforeEach(async () => {
          imapImpl.getBoxes.callsFake((callback) => {
            callback(null, boxes);
          });

          imapEvents.ready();
          await imapInitPromise;
          imapImpl.getBoxes.firstCall.args[0](null, boxes);
        });

        it('lists the mailboxes for the user', () => {
          expect(imapImpl.getBoxes.called).to.be.true();
        });

        it('exposes the user\'s mailboxes', () => {
          expect(imap.mailBoxes).to.equal(boxes);
        });
      });

      describe('edge cases (should never happen)', () => {
        beforeEach(() => {
          imapEvents.ready();
        });

        it('warns that there\'s no handler on subsequent ready event', () => {
          imapEvents.ready();
          expect(logger.warn.called).to.be.true();
        });

        it('warns that there\'s no error handler on subsequent error', () => {
          imapEvents.error(error);
          expect(logger.warn.called).to.be.true();
        });
      });
    });
  });
});

export {};
