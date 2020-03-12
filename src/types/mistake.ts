import {Record, Static, String} from 'runtypes';

import Move, {MoveRecord} from './move';

export const MistakeRecord = Record({
  correctDestination: String,
  errantMove: MoveRecord
});

type Mistake = Static<typeof MistakeRecord>;

export default Mistake;

export function createMistake(correctDestination: string, move: Move): Mistake {
  return {
    correctDestination,
    errantMove: move
  };
}
