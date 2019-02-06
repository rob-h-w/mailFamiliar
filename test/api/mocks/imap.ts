// tslint:disable: ban-types no-string-literal

import {expect} from 'code';
import * as events from 'events';
import * as Imap from 'imap';
import * as sinon from 'sinon';
import {Stream} from 'stream';

type Folder = {[key in keyof Imap.Folder]: Imap.Folder[key] | null};

interface Mailboxes {
  [name: string]: Folder;
}

interface MockMessage {
  attributes: {
    date: Date;
    flags: any[];
    uid: number;
  };
  body: Buffer;
  seqno: number;
}

export interface MockResult {
  class: any;
  fetchReturnsWith: (mails: MockMessage[]) => void;
  object: any;
}

function mockFetchResult(object: any) {
  const fetchListeners: any = {
    on: {},
    once: {}
  };
  const assertDefined = <T>(value: T | null | undefined): T => {
    expect(value).to.exist();

    if (!value) {
      throw new Error('never thrown');
    }

    return value;
  };
  const handlerFor = (message: string) => {
    return assertDefined(fetchListeners.on[message] || fetchListeners.once[message]);
  };
  const checkFetchListeners = () => {
    const messages = ['error', 'message', 'end'];
    if (
      messages
        .map(message => {
          return fetchListeners.on[message] || fetchListeners.once[message];
        })
        .reduce((othersPresent, isPresent) => othersPresent && isPresent, true)
    ) {
      setTimeout(callback, 0);
    }
  };
  const mockFetchObject: Imap.ImapFetch = Object.assign(new events.EventEmitter(), {
    on: sinon.spy((event: string, listener: Function) => {
      fetchListeners.on[event] = listener;
      checkFetchListeners();
      return mockFetchObject;
    }),
    once: sinon.spy((event: string, listener: Function) => {
      fetchListeners.once[event] = listener;
      checkFetchListeners();
      return mockFetchObject;
    })
  });
  const callback = () => {
    expect((mockFetchObject.on as any).called || (mockFetchObject.once as any).called).to.be.true();
    for (const mail of mailList) {
      const fakeMessage = {
        on: sinon.stub()
      };
      const msgHandlerFor = (message: string) => {
        const argList = assertDefined(fakeMessage.on.args.find(argList => argList[0] === message));
        expect(argList.length).to.equal(2);
        return argList[1];
      };

      handlerFor('message')(fakeMessage, mail.seqno);
      msgHandlerFor('attributes')(mail.attributes);
      msgHandlerFor('body')(new Stream.PassThrough().end(mail.body));
      msgHandlerFor('end')();
    }

    handlerFor('end')();
  };
  let mailList: MockMessage[] = [];
  object.fetch.returns(mockFetchObject);
  object.seq.fetch.returns(mockFetchObject);
  return (mails: MockMessage[]) => {
    mailList = mails;
  };
}

export default function imap(mailBoxes: Mailboxes, boxes: ReadonlyArray<Imap.Box>): MockResult {
  const seq = {
    fetch: sinon.stub()
  };
  const object = {
    closeBox: sinon.stub().callsArg(0),
    connect: sinon.stub(),
    fetch: sinon.stub(),
    getBoxes: sinon.stub().callsArgWith(0, null, mailBoxes),
    move: sinon.stub().callsArgWith(2, null),
    on: sinon.stub(),
    once: sinon.stub(),
    openBox: sinon.stub(),
    search: sinon.stub().callsArgWith(1, null, []),
    seq,
    subscribeBox: sinon.stub().callsArg(1)
  };

  for (const box of boxes) {
    object.openBox.withArgs(box.name).callsArgWith(1, null, box);
  }

  return {
    class: sinon.stub().returns(object),
    fetchReturnsWith: mockFetchResult(object),
    object
  };
}
