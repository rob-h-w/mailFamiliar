import * as _ from 'lodash';

import {IMessageBody} from '../imap/promisified';
import IJsonObject from '../types/json';
import IPredictor from './predictor';

interface IEngineState {
  [key: string]: IJsonObject;
}

export interface IMessage {
  engineState: IEngineState;
  date: Date;
  seq: number;
  size?: number;
  uid: number;
}

export function headersFromBody(message: IMessageBody): string {
  if (!_.isString(message.body) || _.isEmpty(message.body)) {
    throw new Error('message body must be a non-empty string.');
  }

  return String(message.body);
}

export function messageFromBody(
  message: IMessageBody,
  predictors: ReadonlyArray<IPredictor>
): IMessage {
  const headers = headersFromBody(message);

  const engineState: IEngineState = {};

  for (const predictor of predictors) {
    engineState[predictor.name()] = predictor.stateFromHeaders(headers);
  }

  return {
    date: message.attrs.date,
    engineState,
    seq: message.seqno,
    size: message.attrs.size,
    uid: message.attrs.uid
  };
}
