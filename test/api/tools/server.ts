import {expect} from 'code';
import * as _ from 'lodash';
import * as path from 'path';
// tslint:disable-next-line: no-var-requires
const promiseRetry = require('promise-retry');

import {MockResult} from '../mocks/imap';

const ROOT = process.cwd();
const SERVER = path.join(ROOT, 'src', 'index');

export interface EventHandlers {
  on: {
    [key: string]: any;
  };
  once: {
    [key: string]: any;
  };
}

export interface StartServerResult {
  eventHandlers: EventHandlers;
  server: any;
}

export async function startServerInHealthyState(imapMock: MockResult): Promise<StartServerResult> {
  const {startServer} = require(SERVER);

  const eventHandlers: EventHandlers = {
    on: {},
    once: {}
  };
  const serverPromise: Promise<any> = startServer();

  await promiseRetry((retry: (error: any) => never, attempt: number) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        imapMock.object.once.args.forEach((args: Array<any>) => {
          expect(args.length).to.equal(2);
          eventHandlers.once[args[0]] = args[1];
        });
        imapMock.object.on.args.forEach((args: Array<any>) => {
          expect(args.length).to.equal(2);
          eventHandlers.on[args[0]] = args[1];
        });
        if (eventHandlers.once.ready) {
          resolve();
        } else {
          reject(new Error('eventHandlers.once.ready not set'));
        }
      }, 10);
    }).catch(error => {
      if (attempt < 4) {
        retry(error);
      }

      throw error;
    });
  });

  eventHandlers.once.ready();
  const server = await serverPromise;

  return {
    eventHandlers,
    server
  };
}
