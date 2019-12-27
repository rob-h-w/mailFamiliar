import {expect} from '@hapi/code';
const {describe, it} = (exports.lab = require('@hapi/lab').script());

import Diff from '../../../src/string/diff';
import stringDiff from '../../../src/string/stringDiff';

describe('stringDiff', () => {
  it('guards against insane minimum lengths', () => {
    expect(() => stringDiff('abc', 'ab', 1)).to.throw();
  });

  it('returns no diffs if the strings are too short', () => {
    expect<Diff>(stringDiff('', '')).to.equal([]);
  });

  it('finds a diff with the default min length', () => {
    expect<Diff>(stringDiff('abab', 'abcab')).to.equal(['ab', null, 'ab']);
  });

  it('does not find a diff with a min length that is too long', () => {
    expect<Diff>(stringDiff('abab', 'abcab', 3)).to.equal([]);
  });

  it('finds diffs longer than the minimum', () => {
    expect<Diff>(stringDiff('Eabc1abc2', '__abc00abc7')).to.equal([null, 'abc', null, 'abc', null]);
  });

  it('finds diffs at the end of the 2nd string', () => {
    expect<Diff>(stringDiff('Eabc1abc2', '__abc')).to.equal([null, 'abc', null]);
  });

  it('copes with escaped characters', () => {
    expect<Diff>(stringDiff('def\tghijk', '__\tghabc')).to.equal([null, '\tgh', null]);
  });
});
