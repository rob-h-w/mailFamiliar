// tslint:disable: ban-types no-string-literal

import {expect} from 'code';
import * as events from 'events';
import {Box, ImapFetch} from 'imap';
import * as sinon from 'sinon';
import {Stream} from 'stream';

import Mailboxes from './mailboxes';
import MockMessage from './mockMessage';
import MockResult, {Simulate} from './mockResult';
import ServerState from './serverState';
import replaceReset from '../../tools/replaceReset';
import {EventHandlers} from '../../tools/server';
import {waitATick} from '../../tools/wait';

export {default as MockMessage} from './mockMessage';
export {default as MockResult} from './mockResult';

function makeSetServerState(
  object: any,
  simulate: Simulate
): (state: ServerState, openBox?: string) => void {
  let currentlyOpenedBoxName: string | null = null;

  return (state: ServerState, openBox?: string) => {
    currentlyOpenedBoxName = openBox || null;
    object.closeBox.reset();
    object.closeBox.callsArg(0);
    object.fetch.reset();
    object.fetch.callsFake((fetchObject: number[]) => {
      if (currentlyOpenedBoxName === null) {
        throw new Error('A box must be opened.');
      }

      return makeFetchResultFor(
        state.folders[currentlyOpenedBoxName].messages.filter(
          msg => fetchObject.indexOf(msg.attributes.uid) !== -1
        )
      );
    });
    object.getBoxes.reset();
    object.getBoxes.callsArgWith(
      0,
      null,
      Object.keys(state.folders).reduce<Mailboxes>((mailBoxes, folderName) => {
        const folderState = state.folders[folderName];
        mailBoxes[folderName] = {
          attribs: folderState.attribs,
          children: folderState.children,
          delimiter: folderState.delimiter,
          parent: folderState.parent
        };
        return mailBoxes;
      }, {})
    );
    object.openBox.reset();
    object.openBox.callsFake((boxName: string, callback: (result: Error | null) => void) => {
      if (Object.keys(state.folders).indexOf(boxName) === -1) {
        return callback(new Error(`Folder ${boxName} isn't present.`));
      }

      currentlyOpenedBoxName = boxName;
      callback(null);
      const msgCount = state.folders[currentlyOpenedBoxName].messages.filter(msg => !msg.synced)
        .length;
      if (msgCount) {
        simulate.event.mail(msgCount);
      }
    });
    object.search.reset();
    object.search.callsFake(
      (searchCriteria: any[], callback: (err: Error | null, uids: number[] | null) => void) => {
        if (currentlyOpenedBoxName === null) {
          return callback(new Error('A box must be opened.'), null);
        }

        if (searchCriteria.length === 0) {
          return callback(null, []);
        }

        const filter =
          searchCriteria[0][0] === 'SINCE'
            ? (msg: MockMessage) => msg.attributes.date >= (searchCriteria[0][1] as Date)
            : () => true;

        return callback(
          null,
          state.folders[currentlyOpenedBoxName].messages
            .filter(filter)
            .map(msg => msg.attributes.uid)
        );
      }
    );

    if (openBox) {
      simulate.event.mail(state.folders[openBox].messages.filter(msg => !msg.synced).length);
    }
  };
}

function makeSimulateMailReceived(
  fetchReturnsWith: (mails: MockMessage[]) => void
): (mails: MockMessage[], eventHandlers: EventHandlers) => Promise<void> {
  return async (mails: MockMessage[], eventHandlers: EventHandlers) => {
    fetchReturnsWith(mails);
    await eventHandlers.on.mail(mails.length);
    await waitATick();
  };
}

function makeEvent<T>(name: string, object: any): (value: T) => void {
  return (value: T) => {
    const calls = object.on.getCalls();
    calls.push(...object.once.getCalls());
    const callbacks = calls
      .filter((call: sinon.SinonSpyCall) => call.args[0] === name)
      .map((call: sinon.SinonSpyCall) => call.args[1]);
    expect(callbacks.length).to.be.lessThan(2);

    if (!callbacks.length) {
      return;
    }

    callbacks[0](value);
  };
}

function makeFetchResultFor(mails: MockMessage[]): ImapFetch {
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
  const mockFetchObject: ImapFetch = Object.assign(new events.EventEmitter(), {
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
    for (const mail of mails) {
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
  return mockFetchObject;
}

function mockFetchResult(object: any) {
  return (mails: MockMessage[]) => {
    const mockFetchObject = makeFetchResultFor(mails);
    object.fetch.returns(mockFetchObject);
    object.seq.fetch.returns(mockFetchObject);
  };
}

export default function imap(mailBoxes: Mailboxes, boxes: ReadonlyArray<Box>): MockResult {
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

  replaceReset(object.openBox, openBox => {
    for (const box of boxes) {
      openBox.withArgs(box.name).callsArgWith(1, null, box);
    }
  });

  const fetchReturnsWith = mockFetchResult(object);
  const simulate: Simulate = {
    event: {
      close: makeEvent('close', object),
      expunge: makeEvent('expunge', object),
      mail: makeEvent('mail', object),
      uidValidity: makeEvent('uidvalidity', object)
    },
    mailReceived: makeSimulateMailReceived(fetchReturnsWith)
  };

  return {
    class: sinon.stub().returns(object),
    fetchReturnsWith,
    object,
    setServerState: makeSetServerState(object, simulate),
    simulate
  };
}
