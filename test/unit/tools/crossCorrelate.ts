import {expect} from 'code';
const {describe, it} = (exports.lab = require('lab').script());

import {crossCorrelateMeanSquared, crossCorrelateStrings} from '../../../src/tools/crossCorrelate';

describe('crossCorrelateMeanSquared', () => {
  describe('with one empty sequence', () => {
    it('returns null', () => {
      expect(crossCorrelateMeanSquared(['a', 'b'], [])).to.equal(null);
      expect(crossCorrelateMeanSquared([], ['a', 'b'])).to.equal(null);
    });
  });

  describe('with equal sequences', () => {
    it('returns offset 0', () => {
      expect(crossCorrelateMeanSquared(['a', 'b'], ['a', 'b'])).to.equal({offset: 0, score: 0});
    });
  });

  describe('with the left sequence first', () => {
    it('returns offset 2', () => {
      expect(crossCorrelateMeanSquared(['a', 'a', 'b', 'c'], ['b', 'c'])).to.equal({
        offset: 2,
        score: 0
      });
    });
  });

  describe('with the right sequence first', () => {
    it('returns offset -2', () => {
      expect(crossCorrelateMeanSquared(['b', 'c'], ['a', 'b', 'b', 'c'])).to.equal({
        offset: -2,
        score: 0
      });
    });
  });

  describe('with a surrogate character', () => {
    it('still finds the correct offset', () => {
      expect(
        crossCorrelateMeanSquared(['\u2665', 'b', 'c'], ['a', 'b', '\u2665', 'b', 'c'])
      ).to.equal({offset: -2, score: 0});
    });
  });
});

describe('crossCorrelateStrings', () => {
  describe('with one empty sequence', () => {
    it('returns null', () => {
      expect(crossCorrelateStrings(['a', 'b'], [])).to.equal(null);
      expect(crossCorrelateStrings([], ['a', 'b'])).to.equal(null);
    });
  });

  describe('with equal sequences', () => {
    it('returns offset 0', () => {
      expect(crossCorrelateStrings(['a', 'b'], ['a', 'b'])).to.equal({offset: 0, score: 0});
    });
  });

  describe('with the left sequence first', () => {
    it('returns offset 2', () => {
      expect(crossCorrelateStrings(['a', 'a', 'b', 'c'], ['b', 'c'])).to.equal({
        offset: 2,
        score: 0
      });
    });
  });

  describe('with the right sequence first', () => {
    it('returns offset -2', () => {
      expect(crossCorrelateStrings(['b', 'c'], ['a', 'b', 'b', 'c'])).to.equal({
        offset: -2,
        score: 0
      });
    });
  });

  describe('with a surrogate character', () => {
    it('still finds the correct offset', () => {
      expect(crossCorrelateStrings(['\u2665', 'b', 'c'], ['a', 'b', '\u2665', 'b', 'c'])).to.equal({
        offset: -2,
        score: 0
      });
    });
  });
});
