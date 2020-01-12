import * as _ from 'lodash';

import {MessageBody} from '../imap/promisified';

export interface Message {
  headers: string;
  date: Date;
  seq: number;
  size?: number;
  uid: number;
}

export function headersFromBody(message: MessageBody): string {
  if (!_.isString(message.body) || _.isEmpty(message.body)) {
    throw new Error('message body must be a non-empty string.');
  }

  return String(message.body);
}

export function messageFromBody(message: MessageBody): Message {
  const headers = headersFromBody(message);

  return {
    date: message.attrs.date,
    headers,
    seq: message.seqno,
    size: message.attrs.size,
    uid: message.attrs.uid
  };
}
