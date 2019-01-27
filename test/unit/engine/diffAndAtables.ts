import {expect} from 'code';
const {beforeEach, describe, it} = (exports.lab = require('lab').script());

import {DiffAndAtables} from '../../../src/engine/diffAndAtables';

describe('DiffAndAtables', () => {
  let daat: DiffAndAtables;

  describe('when empty', () => {
    beforeEach(() => {
      daat = DiffAndAtables.emptyAtables();
    });

    it('has no confidence for a string', () => {
      expect(DiffAndAtables.confidenceFor(daat, 'abc123')).to.equal(0);
    });
  });

  describe('when it knows only 1 string', () => {
    const theString = 'snooty snoot snoot';

    beforeEach(() => {
      daat = DiffAndAtables.emptyAtables();
      DiffAndAtables.addHeadersList(daat, [theString]);
    });

    it('has no confidence for the same string', () => {
      expect(DiffAndAtables.confidenceFor(daat, theString)).to.equal(0);
    });
  });

  describe('when it knows 1 string 2 times', () => {
    const theString = 'snooty snoot snoot';

    beforeEach(() => {
      daat = DiffAndAtables.emptyAtables();
      daat = DiffAndAtables.addHeadersList(daat, [theString, theString]);
    });

    it('has total confidence for the same string', () => {
      expect(DiffAndAtables.confidenceFor(daat, theString)).to.equal(1);
    });
  });

  describe('when it knows 2 strings once each', () => {
    const theString = 'snooty snoot snoot';
    const theOtherString = 'abcdefghijklmnopqrstuvwxyz';

    beforeEach(() => {
      daat = DiffAndAtables.emptyAtables();
      daat = DiffAndAtables.addHeadersList(daat, [theString, theOtherString]);
    });

    it('has nonzero & non-1 confidence for each string', () => {
      const theStringConfidence = DiffAndAtables.confidenceFor(daat, theString);
      const theOtherStringConfidence = DiffAndAtables.confidenceFor(daat, theOtherString);
      expect(theStringConfidence)
        .to.be.greaterThan(0)
        .and.lessThan(1);
      expect(theOtherStringConfidence)
        .to.be.greaterThan(0)
        .and.lessThan(1);
    });

    it('increases its confidence for the string if another similar string is added', () => {
      const initialStringConfidence = DiffAndAtables.confidenceFor(daat, theString);
      daat = DiffAndAtables.addHeadersList(daat, [theString]);
      expect(DiffAndAtables.confidenceFor(daat, theString)).to.be.greaterThan(
        initialStringConfidence
      );
    });

    it('has no confidence for a string that does not conform to other strings', () => {
      expect(DiffAndAtables.confidenceFor(daat, 'xyz')).to.equal(0);
    });
  });
});
