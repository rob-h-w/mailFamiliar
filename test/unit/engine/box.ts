import {expect} from '@hapi/code';
const {afterEach, beforeEach, describe, it} = (exports.lab = require('@hapi/lab').script());
import * as mockery from 'mockery';
import {stub, SinonStub} from 'sinon';

import * as Imap from 'imap';
type ImapBox = Imap.Box;
type ImapFolder = Imap.Folder;

import Promisified from '../../../src/imap/promisified';
import {Message} from 'types/message';

const NAME = 'test';
const NOW = new Date();
const QUALIFIED_NAME = 'a/test';

let logger: {
  debug: SinonStub;
  error: SinonStub;
  info: SinonStub;
  warn: SinonStub;
};
let Box: any;

describe('Box', () => {
  let box: any;
  let imapFolder: ImapFolder;
  let pImap: Promisified;

  beforeEach(() => {
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    logger = {
      debug: stub(),
      error: stub(),
      info: stub(),
      warn: stub()
    };

    mockery.registerMock('../logger', {default: logger});
    mockery.registerAllowable('../../../src/engine/box');
    Box = require('../../../src/engine/box').default;
  });

  afterEach(() => {
    mockery.disable();
    mockery.deregisterAll();
  });

  describe('without pImap', () => {
    it('rejects on open', () => {
      expect(new Box({name: NAME, qualifiedName: QUALIFIED_NAME, syncedTo: 0}).open()).to.reject();
    });
  });

  describe('with pImap', () => {
    beforeEach(() => {
      pImap = ({
        close: stub(),
        closeBox: stub(),
        fetch: stub(),
        getBoxes: stub(),
        move: stub(),
        openBox: stub(),
        search: stub(),
        subscribeBox: stub(),
        waitForConnection: stub()
      } as unknown) as Promisified;
    });

    it('rejects on open', () => {
      expect(
        new Box({name: NAME, pImap, qualifiedName: QUALIFIED_NAME, syncedTo: 0}).open()
      ).to.reject();
    });

    describe('with an IMAP folder', () => {
      beforeEach(() => {
        imapFolder = ({} as unknown) as ImapFolder;
        box = new Box({
          imapFolder,
          name: NAME,
          pImap,
          qualifiedName: QUALIFIED_NAME,
          syncedTo: 1
        });
      });

      it('is not an inbox', () => {
        expect(box.isInbox).to.be.false();
      });

      describe('with an IMAP box', () => {
        let imapBox: ImapBox;
        let openBox: SinonStub;

        beforeEach(() => {
          imapBox = {
            flags: [],
            messages: {
              new: 0,
              total: 5,
              unseen: 0
            },
            name: NAME,
            newKeywords: false,
            permFlags: [],
            persistentUIDs: true,
            readOnly: false,
            uidnext: 20,
            uidvalidity: 2344
          };
          openBox = pImap.openBox as SinonStub;

          openBox.withArgs(QUALIFIED_NAME).resolves(imapBox);
        });

        describe('open', () => {
          let openResult: string;

          beforeEach(async () => {
            openResult = await box.open();
          });

          it('returns NEW', () => {
            expect(openResult).to.equal('NEW');
          });

          it('gives access to the IMAP box', () => {
            expect(box.box).to.equal(imapBox);
          });

          describe('then', () => {
            describe('open again', () => {
              beforeEach(async () => {
                openResult = await box.open();
              });

              it('returns UNCHANGED', () => {
                expect(openResult).to.equal('UNCHANGED');
              });
            });

            describe('add message', () => {
              const HDR1 = '1';
              let message1: Message;

              beforeEach(() => {
                message1 = {
                  date: NOW,
                  headers: HDR1,
                  seq: ++imapBox.messages.total,
                  uid: imapBox.uidnext++
                };

                box.addMessage(message1);
              });

              it('has one message', () => {
                expect(box.messages.length).to.equal(1);
              });

              it('zeros the message seq', () => {
                expect(box.messages[0].seq).to.equal(0);
              });

              describe('and one before it', () => {
                const HDR2 = '2';
                let message2: Message;

                beforeEach(() => {
                  message2 = {
                    date: NOW,
                    headers: HDR2,
                    seq: imapBox.messages.total++,
                    uid: imapBox.uidnext++
                  };

                  box.addMessage(message2);
                });

                it('has 2 messages', () => {
                  expect(box.messages.length).to.equal(2);
                });

                it('puts message 2 first', () => {
                  expect(box.messages[0].headers).to.equal(HDR2);
                });

                describe('then', () => {
                  describe('the one at seq 6 is removed', () => {
                    let removed: Message;

                    beforeEach(() => {
                      removed = box.removeMessage(6);
                    });

                    it('returns the removed message', () => {
                      expect(removed.headers).to.equal(HDR2);
                    });

                    it('leaves the first message', () => {
                      expect(box.messages[0].headers).to.equal(HDR1);
                    });

                    describe('then', () => {
                      describe('the one at seq 6 is removed again', () => {
                        beforeEach(() => {
                          removed = box.removeMessage(6);
                        });

                        it('returns the removed message', () => {
                          expect(removed.headers).to.equal(HDR1);
                        });

                        it('leaves no messages', () => {
                          expect(box.messages.length).to.equal(0);
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});
