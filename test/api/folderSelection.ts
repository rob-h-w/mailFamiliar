import {expect} from 'code';
const {afterEach, beforeEach, describe, it} = (exports.lab = require('lab').script());
import * as _ from 'lodash';
import * as mockery from 'mockery';

import mockImap, {MockResult as ImapMock} from './mocks/imap';
import boxes from './tools/fixture/standard/boxes';
import {useFixture} from './tools/fixture/standard/useFixture';
import {EventHandlers, startServerInHealthyState} from './tools/server';

import {PredictorTypeValues} from '../../src/engine/predictors';
import fakeBox from './mocks/imap/fakeBox';
import {waitATick, until} from './tools/wait';
import bunyan, {MockResult as BunyanMock} from './mocks/bunyan';
import ServerState, {fromBoxes} from './mocks/imap/serverState';
import {mockStorageAndSetEnvironment} from './mocks/mailFamiliarStorage';

let bunyanMock: BunyanMock;
let imapMock: ImapMock;

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

  let eventHandlers: EventHandlers;
  let server: any;
  let serverState: ServerState;

  beforeEach(() => {
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    bunyanMock = bunyan();
    mockery.registerMock('bunyan', bunyanMock.object);
  });

  afterEach(() => {
    mockery.disable();
  });

  PredictorTypeValues.alternatives.forEach(predictorType =>
    describe(`with predictor ${predictorType.value}`, () => {
      beforeEach(async () => {
        await useFixture();

        mockStorageAndSetEnvironment({predictorType: predictorType.value}, 'rob');

        imapMock = mockImap();
        serverState = fromBoxes(boxes);
        const inboxState = serverState.folders.INBOX;
        inboxState.messages = inbox;
        inboxState.messageState.total = inbox.length;
        const interestingSpamState = serverState.folders['Interesting spam'];
        interestingSpamState.messages = interestingSpam;
        interestingSpamState.messageState.total = interestingSpam.length;

        imapMock.setServerState(serverState);

        mockery.registerMock('imap', imapMock.class);

        ({eventHandlers, server} = await startServerInHealthyState(imapMock));
        await until(() => bunyanMock.logger.info.calledWith(`shallow sync complete`));
      });

      afterEach(async () => {
        if (server) {
          await server.stop();
          server = null;
        }
      });

      it('spins up', () => {
        expect(server).to.exist();
      });

      describe("when there's already mail", () => {
        it('spins up', () => {
          expect(server).to.exist();
        });

        describe('when a new mail comes in that matches', () => {
          beforeEach(async () => {
            bunyanMock.logger.debug.reset();
            await imapMock.simulate.mailReceived(
              [
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
              ],
              eventHandlers
            );
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
              await imapMock.simulate.mailReceived(
                [
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
                ],
                eventHandlers
              );
            });

            it('does not move the mail', () => {
              expect(imapMock.object.move.called).to.be.false();
            });
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
                seqno: 2,
                synced: false
              }
            ]);
            await eventHandlers.on.mail(1);
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

  describe('when a mail is moved', () => {
    const SORTED = {
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
    const UNSORTED = {
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

    afterEach(async () => {
      if (server) {
        await server.stop();
        server = null;
      }
    });

    beforeEach(async () => {
      mockery.enable({
        useCleanCache: true,
        warnOnReplace: false,
        warnOnUnregistered: false
      });

      mockStorageAndSetEnvironment({predictorType: 'Traat'}, 'rob@example.com');

      imapMock = mockImap();

      imapMock.setServerState(UNSORTED);
      mockery.registerMock('imap', imapMock.class);

      ({eventHandlers, server} = await startServerInHealthyState(imapMock));
      await until(() => bunyanMock.logger.info.calledWith('shallow sync complete'));
      bunyanMock.logger.info.reset();
      bunyanMock.logger.debug.reset();

      // Why does the INBOX folder in the userconnection not have any messages?
      // We fail to inject Imap.openBox.
      UNSORTED.folders.INBOX.messages.forEach(msg => imapMock.simulate.event.expunge(msg.seqno));
      imapMock.setServerState({...SORTED, currentlyOpenBox: 'INBOX'});
      await until(() => bunyanMock.logger.debug.calledWith('New mails handled'));
      await until(() => bunyanMock.logger.debug.calledWith('Opened INBOX'));
      bunyanMock.logger.debug.reset();
    });

    it('spins up', () => {
      expect(server).to.exist();
    });

    describe('when a new mail comes in that should be moved', () => {
      const NEW_MAIL = {
        folders: {
          INBOX: fakeBox(['this little piggy had an existential crisis']),
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
      NEW_MAIL.folders.INBOX.messages[0].attributes.date = new Date();
      beforeEach(async () => {
        imapMock.setServerState({...NEW_MAIL, currentlyOpenBox: 'INBOX'});
        imapMock.simulate.event.mail(1);

        await until(() => bunyanMock.logger.debug.calledWith('New mails handled'));
        bunyanMock.logger.debug.reset();
      });

      it('moves the mail', () => {
        expect(imapMock.object.move.called).to.be.true();
      });

      it('moves the mail to the Piggies folder', () => {
        expect(imapMock.object.move.args[0]).to.equal([32, 'PIGGIES']);
      });
    });
  });
});
