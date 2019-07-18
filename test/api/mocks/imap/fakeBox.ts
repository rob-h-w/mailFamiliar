import * as crypto from 'crypto';

import FolderState from './folderState';
import {MockMessage} from '.';

const WEEK_MS = 1000 * 60 * 60 * 24 * 7;

function mockMessage(message: string, index: number, now: number): MockMessage {
  const seed = crypto
    .createHash('sha256')
    .update(message)
    .digest()
    .readUInt32BE(0);
  return {
    attributes: {
      date: new Date(now - (seed % WEEK_MS)),
      flags: [] as string[],
      uid: seed
    },
    body: new Buffer(message),
    seqno: index,
    synced: false
  };
}

export default function fakeBox(messages: ReadonlyArray<string>): FolderState {
  const now = Date.now();
  return {
    attribs: [] as string[],
    children: null,
    delimiter: '/',
    messages: messages.map((message, index) => mockMessage(message, index, now)),
    parent: null
  };
}
