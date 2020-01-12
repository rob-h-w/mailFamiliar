import {Array, Number, Record, Static, String, Undefined} from 'runtypes';

import {Message} from './message';

export const MoveRecord = Record({
  destination: String,
  message: Record({
    date: Number,
    headers: String,
    seq: Number,
    size: Number.Or(Undefined),
    uid: Number
  }),
  moveTime: Number
});

type Move = Static<typeof MoveRecord>;

export const MoveRecords = Array(MoveRecord);

export default Move;

export function createMove(destination: string, message: Message, moveTime: Date): Move {
  return {
    destination,
    message: {
      date: message.date.getTime(),
      headers: message.headers,
      seq: message.seq,
      size: message.size,
      uid: message.uid
    },
    moveTime: moveTime.getTime()
  };
}

export function createMoveNow(destination: string, message: Message): Move {
  return createMove(destination, message, new Date());
}

export function createMovesFromJson(json: any): Move[] {
  const validationResult = MoveRecords.validate(json);

  if (validationResult.success) {
    return validationResult.value;
  } else {
    throw new Error(`${validationResult.message}\n${validationResult.key}`);
  }
}
