import {expect} from '@hapi/code';
const {afterEach, beforeEach, describe, it} = (exports.lab = require('@hapi/lab').script());
import * as mockery from 'mockery';
import * as sinon from 'sinon';

import Predictor from '../../../src/engine/predictor';
import {PredictorTypeValues} from '../../../src/engine/predictors';
import {until} from '../../api/tools/wait';

let Box: any;
let clock: sinon.SinonFakeTimers;
let Imap: any;
let imap: any;
let logger: {
  debug: sinon.SinonStub;
  error: sinon.SinonStub;
  info: sinon.SinonStub;
  warn: sinon.SinonStub;
};
let persistence: any;
let predictor: Predictor;
let Promisified: any;
let promisified: any;
let UserConnection: any;
let userConnection: any;
let user: any;

interface BoxParams extends Obj {
  name: string;
  qualifiedName: string;
  syncedTo: number;
}
interface MockedBoxen {
  [x: string]: {
    box: Obj;
    params: BoxParams;
  };
}
interface Obj {
  [x: string]: any;
}
let mockedBoxen: MockedBoxen = {};

function mockBox(params: BoxParams) {
  const name = params.name;
  const box: Obj = {
    addMessage: sinon.stub(),
    isInbox: name === 'INBOX',
    messages: [],
    name,
    open: sinon.stub().resolves(),
    qualifiedName: params.qualifiedName,
    removeMessage: sinon.stub(),
    reset: sinon.stub(),
    setSyncedToNow: sinon.stub(),
    subscribe: sinon.stub().resolves(),
    syncedTo: params.syncedTo,
  };
  box.mergeFrom = (other: Obj) => {
    box.messages = other.messages;
    box.syncedTo = other.syncedTo;
    return box;
  };
  mockedBoxen[name] = {
    box,
    params,
  };
  return box;
}

describe('userConnection', () => {
  beforeEach(() => {
    clock = sinon.useFakeTimers({
      now: 1547375767863,
      shouldAdvanceTime: true,
    });
    mockedBoxen = {};
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false,
    });

    Box = sinon.spy((params: BoxParams) => {
      const box = mockBox(params);
      return box;
    });

    Box.isInbox = sinon.spy((name) => name === 'INBOX');

    imap = {};
    Imap = sinon.stub().returns(imap);

    logger = {
      debug: sinon.stub(),
      error: sinon.stub(),
      info: sinon.stub(),
      warn: sinon.stub(),
    };

    predictor = {
      addHeaders: sinon.stub(),
      addMistake: sinon.stub(),
      considerBox: sinon.stub(),
      folderScore: sinon.stub(),
      name: sinon.stub().returns('name'),
      removeHeaders: sinon.stub(),
    };

    promisified = {
      closeBox: sinon.stub(),
      connect: sinon.stub(),
      fetch: sinon.stub().resolves([]),
      getBoxes: sinon.stub().resolves({}),
      imap: {
        delimiter: '/',
        fetch: sinon.stub(),
        seq: {
          fetch: sinon.stub(),
        },
      },
      on: sinon.stub(),
      once: sinon.stub(),
      openBox: sinon.stub(),
      search: sinon.stub().resolves([]),
      subscribeBox: sinon.stub(),
      waitForConnection: sinon.stub().resolves(),
    };
    Promisified = sinon.stub().withArgs(imap).returns(promisified);

    mockery.registerMock('./box', {default: Box});
    mockery.registerMock('imap', Imap);
    mockery.registerMock('../imap/promisified', {default: Promisified});
    mockery.registerMock('../logger', {default: logger});
    mockery.registerMock('./predictors', {
      create: sinon
        .stub()
        .returns(new Map([[PredictorTypeValues.alternatives[2].value, predictor]])),
    });

    mockery.registerAllowable('../../../src/engine/userConnection');

    UserConnection = require('../../../src/engine/userConnection').default;

    user = {
      predictorType: undefined,
      syncWindowDays: 10,
      trial: undefined,
      user: 'user name',
    };
  });

  afterEach(() => {
    clock.restore();
    mockery.disable();
    mockery.deregisterAll();
  });

  it('is a class', () => {
    expect(UserConnection).to.be.a.function();
  });

  describe('object', () => {
    beforeEach(() => {
      persistence = {
        createBox: sinon.stub(),
        deleteBox: sinon.stub(),
        listBoxes: sinon.stub(),
        listMoves: sinon.stub().resolves([]),
        updateBox: sinon.stub(),
      };
    });

    describe('created with no prior boxes & no online boxes', () => {
      beforeEach(async () => {
        persistence.listBoxes.resolves([]);
        userConnection = new UserConnection(persistence, user);
        await userConnection.init();
      });

      it('exposes boxes', () => {
        expect(userConnection.boxes).to.exist();
        expect(userConnection.boxes).to.be.an.array();
      });

      it('does not create or delete boxes', () => {
        expect(persistence.createBox.called).to.be.false();
        expect(persistence.deleteBox.called).to.be.false();
      });

      describe('disconnected', () => {
        let disconnectCallback: sinon.SinonStub;

        beforeEach(() => {
          logger.debug.reset();
          logger.info.reset();
          logger.warn.reset();
        });

        describe('with callback', () => {
          beforeEach(() => {
            disconnectCallback = sinon.stub();
            userConnection.onDisconnect = disconnectCallback;
          });

          describe('by close with error', () => {
            beforeEach(() => {
              userConnection.onClose(true);
            });

            it('calls the callback', () => {
              expect(disconnectCallback.callCount).to.equal(1);
            });
          });

          describe('by close without error', () => {
            beforeEach(() => {
              userConnection.onClose(false);
            });

            it('calls the callback', () => {
              expect(disconnectCallback.callCount).to.equal(1);
            });
          });

          describe('without a callback', () => {
            beforeEach(() => {
              userConnection.onDisconnect = undefined;
            });

            it('throws', () => {
              expect(() => userConnection.onClose(false)).to.throw();
            });
          });

          describe('by end', () => {
            beforeEach(() => {
              userConnection.onEnd();
            });

            it('calls the callback', () => {
              expect(disconnectCallback.callCount).to.equal(1);
            });

            it('logs correctly', () => {
              expect(logger.info.callCount).to.equal(1);
              expect(logger.info.args[0]).to.equal(['Connection ended.']);
            });
          });
        });

        describe('without callback', () => {
          beforeEach(() => {
            userConnection.onDisconnect = undefined;
          });

          describe('by close with error', () => {
            beforeEach(() => {
              try {
                userConnection.onClose(true);
              } catch {}
            });
          });

          describe('by close without error', () => {
            beforeEach(() => {
              try {
                userConnection.onClose(false);
              } catch {}
            });
          });

          describe('by end', () => {
            beforeEach(() => {
              try {
                userConnection.onEnd();
              } catch {}
            });

            it('logs correctly', () => {
              expect(logger.info.callCount).to.equal(1);
              expect(logger.info.args[0]).to.equal(['Connection ended.']);
              expect(logger.debug.callCount).to.equal(1);
              expect(logger.debug.args[0]).to.equal(['No disconnect callback found.']);
            });
          });
        });
      });
    });

    describe('created with no prior boxes & an online box', () => {
      beforeEach(async () => {
        promisified.getBoxes.resolves({
          INBOX: {
            attribs: [],
            children: {},
            delimiter: '/',
            parent: null,
          },
        });
        persistence.listBoxes.returns([]);
        userConnection = new UserConnection(persistence, user);
        await userConnection.init();
      });

      it('considers boxes before opening the inbox', async () => {
        await until(() => logger.info.calledWith('init complete'));
        expect(
          (predictor.considerBox as sinon.SinonSpy).calledBefore(mockedBoxen.INBOX.box.open)
        ).to.be.true();
      });

      it('does not delete boxes', () => {
        expect(persistence.deleteBox.called).to.be.false();
      });

      it('creates a persisted box', () => {
        expect(persistence.createBox.calledOnce).to.be.true();
        expect(persistence.createBox.firstCall.args[0]).to.equal(user);
        expect(mockedBoxen.INBOX).to.exist();
      });

      it('exposes the box', () => {
        expect(userConnection.boxes.length).to.equal(1);
        const box = userConnection.boxes[0];
        expect(box.name).to.equal('INBOX');
        expect(box.qualifiedName).to.equal('INBOX');
      });

      it('searches for mail', () => {
        expect(promisified.search.called).to.be.true();
      });
    });

    describe('created with a prior box that should be deleted & an online box', () => {
      const deletedBox = {};

      beforeEach(async () => {
        promisified.getBoxes.resolves({
          INBOX: {
            attribs: [],
            children: {},
            delimiter: '/',
            parent: null,
          },
        });
        persistence.listBoxes.returns([deletedBox]);
        userConnection = new UserConnection(persistence, user);
        await userConnection.init();
      });

      it('deletes the old box', () => {
        expect(persistence.deleteBox.calledOnce).to.be.true();
        expect(persistence.deleteBox.firstCall.args).to.equal([user, deletedBox]);
      });

      it('creates a persisted box', () => {
        expect(persistence.createBox.calledOnce).to.be.true();
        expect(persistence.createBox.firstCall.args[0]).to.contain(user);
      });

      it('exposes the box', () => {
        expect(userConnection.boxes.length).to.equal(1);
        expect(userConnection.boxes[0].name).to.equal('INBOX');
      });

      describe('when closeBox throws because a mailbox is not selected', () => {
        beforeEach(() => {
          promisified.closeBox.rejects(new Error('No mailbox is currently selected'));
        });

        it('does not throw', async () => {
          // tslint:disable-next-line:no-string-literal
          expect(async () => userConnection['closeBox']()).not.to.throw();
        });
      });
    });

    describe('created with a prior box & a matching online box', () => {
      const inbox = {
        box: {
          flags: [],
          messages: {
            new: 0,
            total: 0,
          },
          name: 'INBOX',
          uidnext: 1,
          uidvalidity: 1390994418,
        },
        messages: [],
        name: 'INBOX',
        qualifiedName: 'INBOX',
        syncedTo: 1547370062078,
      };

      beforeEach(async () => {
        promisified.getBoxes.resolves({
          INBOX: {
            attribs: [],
            children: {},
            delimiter: '/',
            parent: null,
          },
        });
        persistence.listBoxes.returns([inbox]);
        mockery.deregisterMock('./predictors');
        mockery.resetCache();
        UserConnection = require('../../../src/engine/userConnection').default;
        userConnection = new UserConnection(persistence, user);
        await userConnection.init();
      });

      describe('when new mail is received', () => {
        const message = {
          attrs: {
            date: new Date('2019-01-13T10:36:06.863Z'),
            envelope: {},
            size: 3,
            uid: 1,
          },
          body: 'abc',
          seqno: 1,
        };

        beforeEach(async () => {
          promisified.search.reset();
          promisified.search.resolves([1]);
          promisified.fetch.resolves([message]);
          await userConnection.onMail(1);
        });

        it('searches since the last synced date', () => {
          expect(promisified.search.calledOnce).to.be.true();
          expect(promisified.search.firstCall.args).to.equal([
            [['SINCE', new Date(inbox.syncedTo)]],
          ]);
        });

        it('adds the newly found message', () => {
          expect(mockedBoxen.INBOX.box.addMessage.calledOnce).to.be.true();
          const params = mockedBoxen.INBOX.box.addMessage.firstCall.args;
          expect(params).to.be.an.array();
          expect(params.length).to.equal(1);
          const message = params[0];
          expect(message.date).to.equal(new Date('2019-01-13T10:36:06.863Z'));
          expect(message.headers).to.exist();
          expect(message.seq).to.equal(1);
          expect(message.size).to.equal(3);
          expect(message.uid).to.equal(1);
        });

        describe('when mail is expunged', () => {
          beforeEach(async () => {
            persistence.updateBox.reset();
            mockedBoxen.INBOX.box.messages = mockedBoxen.INBOX.box.addMessage.firstCall.args;
            await userConnection.onExpunge(1);
          });

          it('calls removeMessage', () => {
            expect(mockedBoxen.INBOX.box.removeMessage.calledOnce).to.be.true();
            expect(mockedBoxen.INBOX.box.removeMessage.firstCall.args).to.equal(
              mockedBoxen.INBOX.box.addMessage.firstCall.args
            );
          });

          it('persists the updated box', () => {
            expect(persistence.updateBox.calledOnce).to.be.true();
            expect(persistence.updateBox.firstCall.args).to.equal([user, mockedBoxen.INBOX.box]);
          });
        });
      });

      describe('when uid validity changes', () => {
        beforeEach(async () => {
          promisified.search.reset();
          promisified.search.resolves([]);
          await userConnection.onUidValidity(1);
        });

        it('searches since the last synced date', () => {
          expect(promisified.search.calledOnce).to.be.true();
          expect(promisified.search.firstCall.args).to.equal([
            [['SINCE', new Date(inbox.syncedTo)]],
          ]);
        });

        it('resets the open box', () => {
          expect(mockedBoxen.INBOX.box.reset.calledOnce).to.be.true();
        });
      });

      describe('shallowSync', () => {
        beforeEach(async () => {
          promisified.search.reset();
          promisified.search.resolves([1]);
          promisified.fetch.resolves([
            {
              attrs: {
                date: new Date('2019-01-13T10:36:06.863Z'),
                envelope: {},
                size: 3,
                uid: 1,
              },
              body: 'abc',
              seqno: 1,
            },
          ]);
          await userConnection.shallowSync();
        });

        it('searches since the last synced date', () => {
          expect(promisified.search.called).to.be.true();
          expect(promisified.search.firstCall.args).to.equal([
            [['SINCE', new Date(inbox.syncedTo)]],
          ]);
        });

        it('adds the newly found message', () => {
          expect(mockedBoxen.INBOX.box.addMessage.called).to.be.true();
          const params = mockedBoxen.INBOX.box.addMessage.firstCall.args;
          expect(params).to.be.an.array();
          expect(params.length).to.equal(1);
          const message = params[0];
          expect(message.date).to.equal(new Date('2019-01-13T10:36:06.863Z'));
          expect(message.headers).to.exist();
          expect(message.seq).to.equal(1);
          expect(message.size).to.equal(3);
          expect(message.uid).to.equal(1);
        });
      });
    });
  });
});
