import _ = require('lodash');
import Sinon = require('sinon');

import {expect} from '@hapi/code';
const {beforeEach, describe, it} = (exports.lab = require('@hapi/lab').script());

import Box from '../../../src/engine/box';
import MistakeTracker from '../../../src/engine/mistakeTracker';
import Mistake from '../../../src/types/mistake';
import Move, {createMove} from '../../../src/types/move';

describe('MistakeTracker', () => {
  const headers: ReadonlyArray<string> = ['abc', 'def', 'ghi', 'jkl'];
  const INBOX = 'INBOX';
  const IMPORTANT = 'IMPORTANT';
  const SPAM = 'SPAM';
  const date: Date = new Date();

  let boxen: Box[];
  let moves: Move[];
  let mistakeTracker: MistakeTracker;
  let observer: Sinon.SinonStub;

  beforeEach(() => {
    boxen = [
      new Box({
        messages: [{date, headers: 'abc', seq: 1, uid: 2}],
        name: INBOX,
        qualifiedName: INBOX,
        syncedTo: Date.now()
      })
    ];
    moves = _.map(
      _.zip([IMPORTANT, IMPORTANT, SPAM, SPAM], headers),
      ([destination, headersString]) =>
        createMove(
          destination as string,
          {date, headers: headersString as string, seq: 1, uid: 2},
          date
        )
    );
    observer = Sinon.stub();

    mistakeTracker = new MistakeTracker(moves, boxen, (mistake: Mistake): void => {
      observer(mistake);
    });
  });

  it('provides an empty set of mistakes for unknown destinations', () => {
    expect([mistakeTracker.mistakesFor('not there')]).to.equal([{}]);
  });

  it('lists mistakes for known destinations', () => {
    expect([mistakeTracker.mistakesFor(IMPORTANT)]).to.equal([
      {
        abc: {
          correctDestination: INBOX,
          errantMove: createMove(IMPORTANT, {date, headers: 'abc', seq: 1, uid: 2}, date)
        }
      }
    ]);
    expect(observer.called).to.be.true();
  });

  it('discovers mistakes as new move results come in', () => {
    expect([mistakeTracker.mistakesFor(SPAM)]).to.equal([{}]);
    const message1 = {date, headers: 'ghi', seq: 1, uid: 2};
    mistakeTracker.inspectMessage(INBOX, message1);
    expect([mistakeTracker.mistakesFor(SPAM)]).to.equal([
      {
        ghi: {
          correctDestination: INBOX,
          errantMove: createMove(SPAM, message1, date)
        }
      }
    ]);
    expect(observer.called).to.be.true();
    const message2 = {date, headers: 'mno', seq: 1, uid: 2};
    mistakeTracker.addMove(createMove(SPAM, message2, date));
    mistakeTracker.inspectMessage(IMPORTANT, message2);
    expect([mistakeTracker.mistakesFor(SPAM)]).to.equal([
      {
        ghi: {
          correctDestination: INBOX,
          errantMove: createMove(SPAM, message1, date)
        },
        mno: {
          correctDestination: IMPORTANT,
          errantMove: createMove(SPAM, message2, date)
        }
      }
    ]);
  });
});
