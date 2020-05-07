import {expect} from '@hapi/code';
const {
  after,
  afterEach,
  before,
  beforeEach,
  describe,
  it
} = (exports.lab = require('@hapi/lab').script());
import * as _ from 'lodash';
import * as mockery from 'mockery';
import * as sinon from 'sinon';

import bunyan, {MockResult as BunyanMock} from './mocks/bunyan';
import mockImap from './mocks/imap';
import fakeBox from './mocks/imap/fakeBox';
import {default as ImapMock} from './mocks/imap/mockResult';
import ServerState, {fromBoxes} from './mocks/imap/serverState';
import {mockStorageAndSetEnvironment} from './mocks/mailFamiliarStorage';
import {PredictorTypeValues} from '../../src/engine/predictors';
import boxes from './tools/fixture/standard/boxes';
import {useFixture} from './tools/fixture/standard/useFixture';
import {startServerInHealthyState} from './tools/server';
import stubExit from './tools/stubExit';
import {waitATick, until} from './tools/wait';

let bunyanMock: BunyanMock;
let clock: sinon.SinonFakeTimers;
let imapMock: ImapMock;

stubExit(before, after);

describe('folder selection', () => {
  const inbox = [
    {
      attributes: {
        date: new Date('2018-12-25T12:21:37.000Z'),
        flags: [],
        size: 1234,
        uid: 41
      },
      body: Buffer.from('whut up?'),
      seqno: 41,
      synced: true
    }
  ];
  const interestingSpam = [
    {
      attributes: {
        date: new Date('2018-12-26T01:09:55.000Z'),
        flags: [],
        size: 15711,
        uid: 68
      },
      body: Buffer.from('interesting spam like this'),
      seqno: 68,
      synced: true
    },
    {
      attributes: {
        date: new Date('2018-12-27T00:47:48.000Z'),
        flags: [],
        size: 3688,
        uid: 69
      },
      body: Buffer.from('interesting spam like that'),
      seqno: 69,
      synced: true
    },
    {
      attributes: {
        date: new Date('2018-12-27T12:48:50.000Z'),
        flags: [],
        size: 3655,
        uid: 70
      },
      body: Buffer.from('interesting spam like this'),
      seqno: 70,
      synced: true
    }
  ];

  let server: any;
  let serverState: ServerState;

  beforeEach(() => {
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    bunyanMock = bunyan();
    clock = sinon.useFakeTimers({
      now: new Date('2019-01-01T00:00:00.000Z'),
      shouldAdvanceTime: true
    });
    mockery.registerMock('bunyan', bunyanMock.object);
  });

  async function cleanup(): Promise<void> {
    if (server) {
      await server.stop();
      server = null;
    }

    clock.restore();
    mockery.disable();
  }

  afterEach(cleanup);

  after(cleanup);

  PredictorTypeValues.alternatives.forEach(predictorType =>
    describe(`with predictor ${predictorType.value}`, () => {
      beforeEach(async () => {
        await useFixture();

        mockStorageAndSetEnvironment({predictorType: predictorType.value}, 'rob');

        imapMock = mockImap();
        serverState = fromBoxes(boxes);
        const inboxState = serverState.folders.INBOX;
        inboxState.messages = inbox;
        inboxState.box.messages.total = inbox.length;
        const interestingSpamState = serverState.folders['Interesting spam'];
        interestingSpamState.messages = interestingSpam;
        interestingSpamState.box.messages.total = interestingSpam.length;

        imapMock.setServerState(serverState);

        mockery.registerMock('imap', imapMock.class);

        server = await startServerInHealthyState();
        await until(() => bunyanMock.logger.info.calledWith(`shallow sync complete`));
      });

      it('spins up', () => {
        expect(server).to.exist();
      });

      describe("when there's already mail", () => {
        it('spins up', () => {
          expect(server).to.exist();
        });

        // Broken for CrossCorrelate and RegexAndAtable
        if (['CrossCorrelate', 'RegexAndAtable'].indexOf(predictorType.value) === -1) {
          describe('when a new mail comes in that matches', () => {
            beforeEach(async () => {
              bunyanMock.logger.debug.reset();
              await imapMock.simulate.mailReceived([
                {
                  attributes: {
                    date: new Date(),
                    flags: [],
                    uid: 32
                  },
                  body: Buffer.from('interesting spam like the others'),
                  seqno: 1,
                  synced: false
                }
              ]);
              await until(() => bunyanMock.logger.debug.calledWith('New mails handled'));
            });

            it('moves the mail', () => {
              expect(imapMock.object.move.called).to.be.true();
            });

            it('moves the mail to "Interesting spam"', () => {
              expect(imapMock.object.move.args[0][1]).to.equal('Interesting spam');
            });

            describe('but has been seen', () => {
              beforeEach(async () => {
                imapMock.object.move.reset();
                await imapMock.simulate.mailReceived([
                  {
                    attributes: {
                      date: new Date(),
                      flags: ['\\Seen'],
                      uid: 33
                    },
                    body: Buffer.from('interesting spam like the others'),
                    seqno: 2,
                    synced: false
                  }
                ]);
                await until(() => bunyanMock.logger.debug.calledWith('New mails handled'));
              });

              it('does not move the mail', () => {
                expect(imapMock.object.move.called).to.be.false();
              });
            });
          });
        }

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
                seqno: 2,
                synced: false
              }
            ]);
            await imapMock.eventHandlers.on.mail(1);
            await waitATick();
          });

          it('does not move the mail', () => {
            // Broken for CrossCorrelate.
            if (predictorType.value === 'CrossCorrelate') {
              return;
            }

            expect(imapMock.object.move.called).to.be.false();
          });
        });
      });
    })
  );

  describe('when mail is moved', () => {
    let SORTED;
    let UNSORTED;

    beforeEach(async () => {
      SORTED = {
        folders: {
          INBOX: fakeBox([]),
          PIGGIES: fakeBox([
            'this little piggy went to market',
            'this little piggy stayed home',
            'this little piggy had roast beef',
            'and this little piggy had none',
            'aaand this little piggy went wee wee wee all the way home'
          ]),
          SPAM: fakeBox(['shouty spamulation', 'more spam'])
        }
      };
      UNSORTED = {
        currentlyOpenBox: null,
        folders: {
          INBOX: fakeBox([
            'shouty spamulation',
            'more spam',
            'this little piggy went to market',
            'this little piggy stayed home',
            'this little piggy had roast beef',
            'and this little piggy had none',
            'aaand this little piggy went wee wee wee all the way home'
          ]),
          PIGGIES: fakeBox([]),
          SPAM: fakeBox([])
        }
      };

      mockStorageAndSetEnvironment({predictorType: 'Traat'}, 'rob');

      imapMock = mockImap();

      imapMock.setServerState(UNSORTED);
      mockery.registerMock('imap', imapMock.class);

      server = await startServerInHealthyState();
      await until(() => bunyanMock.logger.info.calledWith('shallow sync complete'));
      bunyanMock.logger.info.reset();
      bunyanMock.logger.debug.reset();

      UNSORTED.folders.INBOX.messages.forEach(msg => imapMock.simulate.event.expunge(msg.seqno));
      imapMock.setServerState({...SORTED, currentlyOpenBox: 'INBOX'});
      await until(() => bunyanMock.logger.debug.calledWith('Opened INBOX'));
      bunyanMock.logger.info.reset();
      bunyanMock.logger.debug.reset();
    });

    it('spins up', () => {
      expect(server).to.exist();
    });

    describe('when a new mail comes in that should be moved', () => {
      beforeEach(async () => {
        imapMock.object.move.reset();
        await imapMock.simulate.mailReceived([
          {
            attributes: {
              date: new Date(),
              flags: [],
              uid: 32
            },
            body: Buffer.from('this little piggy had an existential crisis'),
            seqno: 1,
            synced: false
          }
        ]);

        await until(() => bunyanMock.logger.debug.calledWith('New mails handled'));
        bunyanMock.logger.debug.reset();
      });

      it('moves the mail', () => {
        expect(imapMock.object.move.called).to.be.true();
      });

      it('moves the mail to the Piggies folder', () => {
        expect(imapMock.object.move.args[0]).to.contain([['32'], 'PIGGIES']);
      });
    });
  });
});
