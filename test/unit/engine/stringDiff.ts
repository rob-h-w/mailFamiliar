import {expect} from '@hapi/code';
const {describe, it} = (exports.lab = require('@hapi/lab').script());

import stringDiff from '../../../src/engine/stringDiff';

describe('stringDiff', () => {
  it('guards against insane minimum lengths', () => {
    expect(() => stringDiff('abc', 'ab', 1)).to.throw();
  });

  it('returns no diffs if the strings are too short', () => {
    expect<ReadonlyArray<string | null>>(stringDiff('', '')).to.equal([]);
  });

  it('finds a diff with the default min length', () => {
    expect<ReadonlyArray<string | null>>(stringDiff('abab', 'abcab')).to.equal(['ab', null, 'ab']);
  });

  it('does not find a diff with a min length that is too long', () => {
    expect<ReadonlyArray<string | null>>(stringDiff('abab', 'abcab', 3)).to.equal([]);
  });

  it('finds diffs longer than the minimum', () => {
    expect<ReadonlyArray<string | null>>(stringDiff('Eabc1abc2', '__abc00abc7')).to.equal([
      null,
      'abc',
      null,
      'abc',
      null
    ]);
  });

  it('finds diffs at the end of the 2nd string', () => {
    expect<ReadonlyArray<string | null>>(stringDiff('Eabc1abc2', '__abc')).to.equal([null, 'abc']);
  });

  it('copes with escaped characters', () => {
    expect<ReadonlyArray<string | null>>(stringDiff('def\tghijk', '__\tghabc')).to.equal([
      null,
      '\tgh',
      null
    ]);
  });
});
