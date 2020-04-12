// tslint:disable: ban-types no-string-literal

import {expect} from '@hapi/code';
import * as events from 'events';
import {ImapFetch} from 'imap';
import * as _ from 'lodash';
import * as sinon from 'sinon';
import {Stream} from 'stream';

import Mailboxes from './mailboxes';
import MockMessage from './mockMessage';
import MockResult, {Simulate, EventHandlers} from './mockResult';
import ServerState from './serverState';
import {waitATick} from '../../tools/wait';
import replaceReset from '../../tools/replaceReset';

let newMails: MockMessage[] = [];

function getAllMails(object: any) {
  return object._state.folders[object._currentlyOpened].messages.concat(
    object._currentlyOpened === 'INBOX' ? newMails : []
  );
}

function makeSetServerState(
  object: any,
  simulate: Simulate
): (state: ServerState, openBox?: string) => void {
  return (state: ServerState) => {
    object._currentlyOpened = state.currentlyOpenBox || null;
    object._simulate = simulate;
    object._state = state;
    object.closeBox.reset();
    object.fetch.reset();
    object.getBoxes.reset();
    object.openBox.reset();
    object.search.reset();
  };
}

function makeSimulateMailReceived(
  eventHandlers: EventHandlers
): (mails: MockMessage[]) => Promise<void> {
  return async (mails: MockMessage[]) => {
    newMails = mails;
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
    once: {},
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
        .map((message) => {
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
    }),
    removeListener: sinon.spy((event: string, listener: Function) => {
      if (fetchListeners.on[event] === listener) {
        delete fetchListeners.on[event];
      }

      if (fetchListeners.once[event] === listener) {
        delete fetchListeners.once[event];
      }
    }),
  });
  const callback = () => {
    expect((mockFetchObject.on as any).called || (mockFetchObject.once as any).called).to.be.true();
    for (const mail of mails) {
      const fakeMessage = {
        on: sinon.stub(),
        removeListener: sinon.stub(),
      };
      const msgHandlerFor = (message: string) => {
        const argList = assertDefined(
          fakeMessage.on.args.find((argList) => argList[0] === message)
        );
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

export default function imap(): MockResult {
  const seq = {
    fetch: sinon.stub(),
  };
  const object = {
    _currentlyOpened: null as null | string,
    _simulate: null as any,
    _state: null as any,
    closeBox: sinon.stub().callsArg(0),
    connect: sinon.stub(),
    fetch: sinon.stub(),
    getBoxes: sinon.stub(),
    move: sinon.stub().callsArgWith(2, null),
    on: sinon.stub(),
    once: sinon.stub(),
    openBox: sinon.stub(),
    removeListener: sinon.stub(),
    search: sinon.stub().callsArgWith(1, null, []),
    seq,
    subscribeBox: sinon.stub().callsArg(1),
  };
  const eventHandlers: EventHandlers = {
    on: {},
    once: {},
  };

  replaceReset(object.closeBox, () => {
    object.closeBox.callsFake((callback: (result: Error | null) => void) => {
      object._currentlyOpened = null;
      callback(null);
    });
  });

  replaceReset(object.connect, () => {
    object.connect.callsFake(() => {
      if (eventHandlers.on.ready) {
        eventHandlers.on.ready();
      } else if (eventHandlers.once.ready) {
        eventHandlers.once.ready();
      }
    });
  });

  replaceReset(object.fetch, () => {
    object.fetch.callsFake(
      (fetchObject: number[]): ImapFetch => {
        if (object._currentlyOpened === null) {
          throw new Error('A box must be opened.');
        }

        const allMessages = getAllMails(object);

        return makeFetchResultFor(
          allMessages.filter((msg: any) => fetchObject.indexOf(msg.attributes.uid) !== -1)
        );
      }
    );
  });

  replaceReset(object.getBoxes, () => {
    object.getBoxes.callsFake(
      (callback: (result: Error | null, boxes: Mailboxes | null) => void) => {
        if (object._state === null) {
          return callback(null, {});
        }

        callback(
          null,
          Object.keys(object._state.folders).reduce<Mailboxes>((mailBoxes, folderName) => {
            const folderState = object._state.folders[folderName];
            mailBoxes[folderName] = {
              attribs: folderState.attribs,
              children: folderState.children,
              delimiter: folderState.delimiter,
              parent: folderState.parent,
            };
            return mailBoxes;
          }, {})
        );
      }
    );
  });

  replaceReset(object.move, () => object.move.callsArgWith(2, null));

  replaceReset(object.on, () =>
    object.on.callsFake((name: string, callback: Function) => {
      eventHandlers.on[name] = callback;
    })
  );

  replaceReset(object.once, () =>
    object.once.callsFake((name: string, callback: Function) => {
      eventHandlers.once[name] = callback;
    })
  );

  replaceReset(object.openBox, () => {
    object.openBox.callsFake((boxName: string, callback: (result: Error | null) => void) => {
      if (Object.keys(object._state.folders).indexOf(boxName) === -1) {
        return callback(new Error(`Mailbox doesn't exist: ${boxName}`));
      }

      object._currentlyOpened = boxName;
      callback(null);
      const msgCount = object._state.folders[object._currentlyOpened].messages.filter(
        (msg: any) => !msg.synced
      ).length;
      if (msgCount) {
        object._simulate.event.mail(msgCount);
      }
    });
  });

  replaceReset(object.search, () => {
    newMails = [];
    object.search.callsFake(
      (searchCriteria: any[], callback: (err: Error | null, uids: number[] | null) => void) => {
        if (object._currentlyOpened === null) {
          return callback(new Error('A box must be opened.'), null);
        }

        if (searchCriteria.length === 0) {
          return callback(null, []);
        }

        const allMessages = getAllMails(object);

        const filter =
          searchCriteria[0][0] === 'SINCE'
            ? (msg: MockMessage) => msg.attributes.date >= (searchCriteria[0][1] as Date)
            : () => true;

        return callback(
          null,
          allMessages.filter(filter).map((msg: any) => msg.attributes.uid)
        );
      }
    );
  });

  const fetchReturnsWith = mockFetchResult(object);
  const simulate: Simulate = {
    event: {
      close: makeEvent('close', object),
      expunge: makeEvent('expunge', object),
      mail: makeEvent('mail', object),
      uidValidity: makeEvent('uidvalidity', object),
    },
    mailReceived: makeSimulateMailReceived(eventHandlers),
  };
  const setServerState = makeSetServerState(object, simulate);

  return {
    class: sinon.stub().returns(object),
    eventHandlers,
    fetchReturnsWith,
    object,
    setServerState,
    simulate,
  };
}
