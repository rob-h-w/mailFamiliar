import {expect} from 'code';
const {beforeEach, describe, it} = (exports.lab = require('lab').script());

import ThresholdedDiffAndAtables from '../../../src/engine/thresholdedDiffAndAtables';

describe('ThresholdedDiffAndAtables', () => {
  let tdaat: ThresholdedDiffAndAtables;

  describe('when empty,', () => {
    beforeEach(() => {
      tdaat = new ThresholdedDiffAndAtables([]);
    });

    it('has confidence 0 for any string', () => {
      expect(tdaat.confidenceFor('hello')).to.equal(0);
      expect(tdaat.confidenceFor('')).to.equal(0);
    });

    describe('and strings are added,', () => {
      const strings: ReadonlyArray<string> = ['chicken', 'egg', 'xylophone', 'ogg', 'ego'];

      beforeEach(() => {
        tdaat.addStrings(strings);
      });

      strings.forEach(str =>
        it(`matches ${str}`, () => expect(tdaat.confidenceFor(str)).to.equal(1))
      );

      it('partly matches a string not shown to it', () => {
        expect(tdaat.confidenceFor('mogg'))
          .to.be.lessThan(1)
          .and.to.be.greaterThan(0);
      });
    });
  });
});
