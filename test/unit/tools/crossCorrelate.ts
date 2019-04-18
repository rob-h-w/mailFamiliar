import {expect} from 'code';
const {describe, it} = (exports.lab = require('lab').script());

import {crossCorrelate1d} from '../../../src/tools/crossCorrelate';

describe('crossCorrelate1d', () => {
  describe('with one empty sequence', () => {
    it('returns 0', () => {
      expect(crossCorrelate1d(['a', 'b'], [])).to.equal(0);
      expect(crossCorrelate1d([], ['a', 'b'])).to.equal(0);
    });
  });

  describe('with equal sequences', () => {
    it('returns 0', () => {
      expect(crossCorrelate1d(['a', 'b'], ['a', 'b'])).to.equal(0);
    });
  });

  describe('with the left sequence first', () => {
    it('returns 2', () => {
      expect(crossCorrelate1d(['a', 'a', 'b', 'c'], ['b', 'c'])).to.equal(2);
    });
  });

  describe('with the right sequence first', () => {
    it('returns -2', () => {
      expect(crossCorrelate1d(['b', 'c'], ['a', 'b', 'b', 'c'])).to.equal(-2);
    });
  });

  describe('with a surrogate character', () => {
    it('still finds the correct offset', () => {
      expect(crossCorrelate1d(['\u2665', 'b', 'c'], ['a', 'b', '\u2665', 'b', 'c'])).to.equal(-2);
    });
  });
});
