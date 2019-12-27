import {expect} from '@hapi/code';
const {describe, it} = (exports.lab = require('@hapi/lab').script());

import match from '../../../src/string/match';
import Diff from '../../../src/string/diff';

describe('match', () => {
  it('is a function', () => {
    expect(match).to.be.a.function();
  });

  it('does not match empty diffs', () => {
    expect(match([], 'hello').isComplete).to.be.false();
  });

  it('matches a simple wildcard diff', () => {
    expect(match([null], 'hello')).to.equal({isComplete: true, wildcardMatches: ['hello']});
  });

  it('matches a single leading wildcard', () => {
    expect(match([null, 'abc'], 'hello abc')).to.equal({
      isComplete: true,
      wildcardMatches: ['hello ']
    });
  });

  it('matches a single trailing wildcard', () => {
    expect(match(['abc', null], 'abcdef')).to.equal({isComplete: true, wildcardMatches: ['def']});
  });

  it('finds the first match', () => {
    expect(match(['abc', null], 'abcabc')).to.equal({isComplete: true, wildcardMatches: ['abc']});
  });

  describe('with a null start and end diff', () => {
    const diff: Diff = [null, 'abc', null, 'abe', null];

    it('detects partial matches', () => {
      expect(match(diff, 'This little piggy learned his abcs.')).to.equal({
        isComplete: false,
        wildcardMatches: ['This little piggy learned his ', 's.']
      });
    });

    it('detects complete matches without wildcard elements', () => {
      expect(match(diff, 'abcabe')).to.equal({isComplete: true, wildcardMatches: ['', '', '']});
    });

    it('detects complete matches with wildcard elements', () => {
      expect(match(diff, '1abc2abe3')).to.equal({
        isComplete: true,
        wildcardMatches: ['1', '2', '3']
      });
    });
  });

  describe('with nonnull start and end diffs', () => {
    const diff: Diff = ['abc', null, 'def'];

    it('detects complete matches with wildcard elements', () => {
      expect(match(diff, 'abc1def')).to.equal({isComplete: true, wildcardMatches: ['1']});
    });

    it('detects complete matches with empty wildcard elements', () => {
      expect(match(diff, 'abcdef')).to.equal({isComplete: true, wildcardMatches: ['']});
    });

    it('does not add unexpected trailing wildcards', () => {
      expect(match(diff, 'abcdefabc')).to.equal({isComplete: false, wildcardMatches: ['']});
    });

    it('detects the last match has failed', () => {
      expect(match(diff, 'abcdec')).to.equal({isComplete: false, wildcardMatches: []});
    });
  });
});
