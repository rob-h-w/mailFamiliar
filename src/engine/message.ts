import * as _ from 'lodash';

import {IMessageBody} from '../imap/promisified';

interface IEmail {
  host: string;
  mailbox: string;
  name: string | null;
}

interface IEnvelope {
  bcc: IEmail[] | null;
  cc: IEmail[] | null;
  date: Date;
  from: IEmail[];
  inReplyTo: string[] | null;
  messageId: string;
  replyTo: IEmail[] | null;
  sender: IEmail[] | null;
  subject: string;
  to: IEmail[] | null;
}

export interface IMessage {
  envelope: IEnvelope;
  headers: string;
  size?: number;
  uid: number;
}

export function messageFromBody(message: IMessageBody): IMessage {
  if (!_.isString(message.body) || _.isEmpty(message.body)) {
    throw new Error('message body must be a non-empty string.');
  }

  const envelope = (message.attrs as any).envelope;
  if (_.isUndefined(envelope)) {
    throw new Error('envelope must be provided.');
  }

  return {
    envelope,
    headers: String(message.body),
    size: message.attrs.size,
    uid: message.attrs.uid
  };
}
