import {expect} from '@hapi/code';
const {afterEach, beforeEach, describe, it} = (exports.lab = require('@hapi/lab').script());
import * as mockery from 'mockery';
import * as sinon from 'sinon';

let functions: any;
let Imap: any;
let imap: any;
let logger: any;

describe('functions', () => {
  beforeEach(() => {
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    imap = {
      connect: sinon.stub(),
      getBoxes: sinon.stub(),
      once: sinon.stub()
    };
    Imap = sinon.stub().returns(imap);
    logger = {
      debug: sinon.stub(),
      error: sinon.stub(),
      info: sinon.stub(),
      warn: sinon.stub()
    };

    mockery.registerMock('imap', Imap);
    mockery.registerMock('../logger', {default: logger});

    functions = require('../../../src/imap/functions');
  });

  afterEach(() => {
    mockery.disable();
  });

  it('exposes functions', () => {
    expect(functions).to.exist();
    expect(functions).to.be.an.object();
  });

  describe('waitForConnection', () => {
    let errorCallback: (error: Error) => void;
    let promise: Promise<any>;
    let readyCallback: () => void;

    beforeEach(() => {
      promise = functions.waitForConnection(imap);
      promise.then(() => {}).catch(() => {});
      expect(imap.once.calledTwice).to.be.true();
      errorCallback = imap.once.args.filter((arg: any[]) => arg[0] === 'error')[0][1];
      readyCallback = imap.once.args.filter((arg: any[]) => arg[0] === 'ready')[0][1];
    });

    it('calls connect', () => {
      expect(imap.connect.called).to.be.true();
    });

    describe("when there's an error", () => {
      beforeEach(() => {
        errorCallback(new Error());
      });

      it('rejects as expected', () => {
        expect(promise).to.reject();
      });

      it('logs the error', () => {
        expect(logger.error.calledOnce).to.be.true();
      });

      it('does not warn', () => {
        expect(logger.warn.called).to.be.false();
      });

      it('warns if we call the error callback again', () => {
        errorCallback(new Error());
        expect(logger.warn.called).to.be.true();
      });
    });

    describe('when IMAP is ready', () => {
      beforeEach(() => {
        readyCallback();
      });

      it('does not warn', () => {
        expect(logger.warn.called).to.be.false();
      });

      it('logs the event', () => {
        expect(logger.debug.calledOnce).to.be.true();
        expect(logger.debug.firstCall.args).to.equal(['ready']);
      });

      it('warns if we call the error callback again', () => {
        readyCallback();
        expect(logger.warn.called).to.be.true();
      });
    });
  });
});

export {};
