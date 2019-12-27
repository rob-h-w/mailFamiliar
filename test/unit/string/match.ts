import {expect} from '@hapi/code';
const {describe, it} = (exports.lab = require('@hapi/lab').script());

import match, {matches} from '../../../src/string/match';
import Diff from '../../../src/string/diff';

describe('match', () => {
  it('is a function', () => {
    expect(match).to.be.a.function();
  });

  it('does not match empty diffs', () => {
    expect(match([], 'hello').isComplete).to.be.false();
  });

  it('matches a simple wildcard diff', () => {
    expect(match([null], 'hello')).to.equal({
      isComplete: true,
      remainder: '',
      wildcardMatches: ['hello']
    });
  });

  it('matches exactly', () => {
    expect(match(['abc'], 'abc')).to.equal({isComplete: true, remainder: '', wildcardMatches: []});
  });

  it('matches a single leading wildcard', () => {
    expect(match([null, 'abc'], 'hello abc')).to.equal({
      isComplete: true,
      remainder: '',
      wildcardMatches: ['hello ']
    });
  });

  it('matches a single trailing wildcard', () => {
    expect(match(['abc', null], 'abcdef')).to.equal({
      isComplete: true,
      remainder: '',
      wildcardMatches: ['def']
    });
  });

  it('finds the first match', () => {
    expect(match(['abc', null], 'abcabc')).to.equal({
      isComplete: true,
      remainder: '',
      wildcardMatches: ['abc']
    });
  });

  describe('with a null start and end diff', () => {
    const diff: Diff = [null, 'abc', null, 'abe', null];

    it('detects partial matches', () => {
      expect(match(diff, 'This little piggy learned his abcs.')).to.equal({
        isComplete: false,
        remainder: '',
        wildcardMatches: ['This little piggy learned his ', 's.']
      });
    });

    it('detects complete matches without wildcard elements', () => {
      expect(match(diff, 'abcabe')).to.equal({
        isComplete: true,
        remainder: '',
        wildcardMatches: ['', '', '']
      });
    });

    it('detects complete matches with wildcard elements', () => {
      expect(match(diff, '1abc2abe3')).to.equal({
        isComplete: true,
        remainder: '',
        wildcardMatches: ['1', '2', '3']
      });
    });
  });

  describe('with nonnull start and end diffs', () => {
    const diff: Diff = ['abc', null, 'def'];

    it('detects complete matches with wildcard elements', () => {
      expect(match(diff, 'abc1def')).to.equal({
        isComplete: true,
        remainder: '',
        wildcardMatches: ['1']
      });
    });

    it('detects complete matches with empty wildcard elements', () => {
      expect(match(diff, 'abcdef')).to.equal({
        isComplete: true,
        remainder: '',
        wildcardMatches: ['']
      });
    });

    it('does not add unexpected trailing wildcards', () => {
      expect(match(diff, 'abcdefabc')).to.equal({
        isComplete: false,
        remainder: 'abc',
        wildcardMatches: ['']
      });
    });

    it('detects the last match has failed', () => {
      expect(match(diff, 'abcdec')).to.equal({
        isComplete: false,
        remainder: 'dec',
        wildcardMatches: []
      });
    });
  });
});

describe('matches', () => {
  it('is a function', () => {
    expect(matches).to.be.a.function();
  });

  it('does not match if the diff is empty', () => {
    expect(matches([], 'nope')).to.equal(false);
  });

  it('detects a wildcard match', () => {
    expect(matches([null], 'anything')).to.be.true();
  });

  it('detects an exact match', () => {
    expect(matches(['abc'], 'abc')).to.be.true();
  });

  describe('with a null start and end diff', () => {
    const diff: Diff = [null, 'abc', null, 'abe', null];

    it('ignores partial matches', () => {
      expect(matches(diff, 'This little piggy learned his abcs.')).to.be.false();
    });

    it('detects complete matches without wildcard elements', () => {
      expect(matches(diff, 'abcabe')).to.be.true();
    });

    it('detects complete matches with wildcard elements', () => {
      expect(matches(diff, '1abc2abe3')).to.be.true();
    });
  });

  describe('with nonnull start and end diffs', () => {
    const diff: Diff = ['abc', null, 'def'];

    it('detects complete matches with wildcard elements', () => {
      expect(matches(diff, 'abc1def')).to.be.true();
    });

    it('detects complete matches with empty wildcard elements', () => {
      expect(matches(diff, 'abcdef')).to.be.true();
    });

    it('unexpected trailing wildcards cause failure', () => {
      expect(matches(diff, 'abcdefabc')).to.be.false();
    });

    it('detects the last match has failed', () => {
      expect(matches(diff, 'abcdec')).to.be.false();
    });
  });
});
