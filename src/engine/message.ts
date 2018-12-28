import * as _ from 'lodash';

import AdjacencyTable from './adjacencyTable';
import {IMessageBody} from '../imap/promisified';

interface IEngineState {
  adjacencyTable: AdjacencyTable;
}

export interface IMessage {
  engineState: IEngineState;
  date: Date;
  size?: number;
  uid: number;
}

export function headersFromBody(message: IMessageBody): string {
  if (!_.isString(message.body) || _.isEmpty(message.body)) {
    throw new Error('message body must be a non-empty string.');
  }

  return String(message.body);
}

export function messageFromBody(message: IMessageBody): IMessage {
  const headers = headersFromBody(message);
  const envelope = (message.attrs as any).envelope;
  if (_.isUndefined(envelope)) {
    throw new Error('envelope must be provided.');
  }

  return {
    date: envelope.date,
    engineState: {
      adjacencyTable: new AdjacencyTable(headers)
    },
    size: message.attrs.size,
    uid: message.attrs.uid
  };
}
