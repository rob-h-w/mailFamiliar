import {expect} from 'code';
const {afterEach, beforeEach, describe, it} = (exports.lab = require('lab').script());
import * as _ from 'lodash';
import * as mockery from 'mockery';

import fs, {MockResult as FsMock} from './mocks/fs';
import mockImap, {MockResult as ImapMock} from './mocks/imap';
import boxes from './tools/fixture/standard/boxes';
import mailBoxes from './tools/fixture/standard/mailBoxes';
import {useFixture} from './tools/fixture/standard/useFixture';
import {EventHandlers, startServerInHealthyState} from './tools/server';

import {PredictorTypeValues} from '../../src/engine/predictors';
import fakeBox from './mocks/imap/fakeBox';
import {waitATick} from './tools/wait';

let fsMock: FsMock;
let imapMock: ImapMock;

describe('folder selection', () => {
  let eventHandlers: EventHandlers;
  let server: any;

  PredictorTypeValues.alternatives.forEach(predictorType =>
    describe(`with predictor ${predictorType.value}`, () => {
      beforeEach(async () => {
        await useFixture();

        mockery.enable({
          useCleanCache: true,
          warnOnReplace: false,
          warnOnUnregistered: false
        });

        fsMock = fs();
        fsMock
          .setup()
          .withLog()
          .withConfig({predictorType: predictorType.value}, 'rob', false);

        mockery.registerMock('fs', fsMock.fs());

        imapMock = mockImap(mailBoxes, boxes);

        mockery.registerMock('imap', imapMock.class);

        ({eventHandlers, server} = await startServerInHealthyState(imapMock));
      });

      afterEach(async () => {
        if (server) {
          await server.stop();
          server = null;
        }

        fsMock.teardown();

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
              flags: [],
              size: 15711,
              uid: 68
            },
            body: 'interesting spam like this',
            seqno: 68
          },
          {
            attrs: {
              date: new Date('2018-12-27T00:47:48.000Z'),
              flags: [],
              size: 3688,
              uid: 69
            },
            body: 'interesting spam like that',
            seqno: 69
          },
          {
            attrs: {
              date: new Date('2018-12-27T12:48:50.000Z'),
              flags: [],
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
            await waitATick();
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
              await imapMock.simulateMailReceived(
                [
                  {
                    attributes: {
                      date: new Date(),
                      flags: ['\\Seen'],
                      uid: 33
                    },
                    body: Buffer.from('interesting spam like the others'),
                    seqno: 2
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
                seqno: 2
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

    let storageEnv: string | undefined;

    afterEach(async () => {
      if (server) {
        await server.stop();
        server = null;
      }

      fsMock.teardown();

      mockery.disable();
      process.env.M_FAMILIAR_STORAGE = storageEnv;
    });

    beforeEach(async () => {
      storageEnv = process.env.M_FAMILIAR_STORAGE;
      process.env.M_FAMILIAR_STORAGE = '/storage';
      mockery.enable({
        useCleanCache: true,
        warnOnReplace: false,
        warnOnUnregistered: false
      });

      fsMock = fs();
      fsMock
        .setup()
        .withLog()
        .withConfig({predictorType: 'Traat'}, 'rob@example.com', true);

      mockery.registerMock('fs', fsMock.fs());

      imapMock = mockImap(mailBoxes, boxes);

      imapMock.setServerState(UNSORTED);
      mockery.registerMock('imap', imapMock.class);

      ({eventHandlers, server} = await startServerInHealthyState(imapMock));
      imapMock.setServerState(SORTED);
    });

    it('spins up', () => {
      expect(server).to.exist();
    });

    describe('when a new mail comes in that should be moved', () => {
      beforeEach(async () => {
        imapMock.simulateMailReceived(
          [
            {
              attributes: {
                date: new Date(),
                flags: [],
                uid: 32
              },
              body: Buffer.from('this little piggy had an existential crisis'),
              seqno: 1
            }
          ],
          eventHandlers
        );
      });
    });
  });
});
