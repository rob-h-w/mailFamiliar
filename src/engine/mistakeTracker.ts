import _ = require('lodash');

import Box from './box';
import Mistake, {createMistake} from '../types/mistake';
import Move from '../types/move';
import {Message} from 'types/message';

export type MistakesByHeader = _.Dictionary<Mistake>;
export type MistakeObserver = (mistake: Mistake) => void;

export default class MistakeTracker {
  readonly mistakesByErrantDestination: _.Dictionary<MistakesByHeader>;
  readonly movesByHeader: _.Dictionary<Move>;
  readonly observer?: MistakeObserver;

  constructor(
    moves: ReadonlyArray<Move>,
    initializedBoxen: ReadonlyArray<Box>,
    observer?: MistakeObserver
  ) {
    this.movesByHeader = _.fromPairs(_.map(moves, move => [move.message.headers, move]));
    this.mistakesByErrantDestination = {};
    this.observer = observer;
    initializedBoxen.forEach(box => {
      const qualifiedName = box.qualifiedName;
      box.messages.forEach(message => {
        const move: Move | undefined = this.movesByHeader[message.headers];
        if (move && move.destination !== qualifiedName) {
          this.addMistake(createMistake(qualifiedName, move));
        }
      });
    });
  }

  addMove(move: Move): void {
    this.movesByHeader[move.message.headers] = move;
  }

  inspectMessage(qualifiedBoxName: string, message: Message): void {
    const move = this.movesByHeader[message.headers];
    if (!move || qualifiedBoxName === move.destination) {
      return;
    }

    this.addMistake(createMistake(qualifiedBoxName, move));
  }

  mistakesFor(destination: string): MistakesByHeader {
    return this.mistakesByErrantDestination[destination] || {};
  }

  private addMistake(mistake: Mistake): void {
    if (!this.mistakesByErrantDestination[mistake.errantMove.destination]) {
      this.mistakesByErrantDestination[mistake.errantMove.destination] = {};
    }

    this.mistakesByErrantDestination[mistake.errantMove.destination][
      mistake.errantMove.message.headers
    ] = mistake;

    if (this.observer) {
      this.observer(mistake);
    }
  }
}
