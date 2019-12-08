import {expect} from '@hapi/code';
const {beforeEach, describe, it} = (exports.lab = require('@hapi/lab').script());

import AdjacencyTable from '../../../src/engine/adjacencyTable';

describe('AdjacencyTable', () => {
  let aTable: AdjacencyTable;

  describe('constructed undefined', () => {
    beforeEach(() => {
      aTable = new AdjacencyTable();
    });

    it('is empty', () => {
      const raw = aTable.raw;
      expect<{[key: string]: number}>(raw.table).to.equal({});
      expect(raw.totalSampleLength).to.equal(0);
      expect(raw.totalSamples).to.equal(0);
    });
  });

  describe('constructed with a string', () => {
    beforeEach(() => {
      aTable = new AdjacencyTable('abc123');
    });

    it('contains the correct statistics', () => {
      const raw = aTable.raw;
      expect<{[key: string]: number}>(raw.table).to.equal({
        12: 1,
        23: 1,
        '3FINISH': 1,
        STARTa: 1,
        ab: 1,
        bc: 1,
        c1: 1
      });

      expect(raw.totalSampleLength).to.equal(6);
      expect(raw.totalSamples).to.equal(1);
    });
  });

  describe('constructed with an adjacency table', () => {
    beforeEach(() => {
      // pooo
      aTable = new AdjacencyTable({
        table: {
          STARTp: 1,
          oFINISH: 1,
          oo: 2,
          po: 1
        },
        totalSampleLength: 4,
        totalSamples: 1
      });
    });

    it('contains the correct statistics', () => {
      const raw = aTable.raw;
      expect<{[key: string]: number}>(raw.table).to.equal({
        STARTp: 1,
        oFINISH: 1,
        oo: 2,
        po: 1
      });

      expect(raw.totalSampleLength).to.equal(4);
      expect(raw.totalSamples).to.equal(1);
    });

    [
      {
        f: AdjacencyTable.START,
        p: 1,
        s: 'p'
      },
      {
        f: 'o',
        p: 2 / 3,
        s: 'o'
      },
      {
        f: 'p',
        p: 1,
        s: 'o'
      },
      {
        f: 'o',
        p: 0,
        s: 'p'
      },
      {
        f: 'o',
        p: 1 / 3,
        s: AdjacencyTable.FINISH
      }
    ].forEach(c => {
      it(`calculates the probability of ${c.f} then ${c.s} correctly`, () => {
        expect(aTable.pAThenB(c.f, c.s)).to.equal(c.p);
      });
    });

    it('calculates the confidence of a string belonging to its set', () => {
      // (1 + 1 + 1 / 3) / 3 = 7 / 9
      expect(aTable.confidenceFor('po')).to.equal(7 / 9);
    });

    describe('added to an undefined aTable', () => {
      it('it is a no-op', () => {
        const before = aTable.raw;
        aTable.addAdjacencyTable();
        expect(aTable.raw).to.equal(before);
      });
    });

    describe('added to an undefined string', () => {
      it('it is a no-op', () => {
        const before = aTable.raw;
        aTable.addString();
        expect(aTable.raw).to.equal(before);
      });
    });

    describe('subtraction', () => {
      const subtrahend = new AdjacencyTable('po');

      it('of a string undoes addition', () => {
        const minuend = new AdjacencyTable(aTable.raw);
        minuend.addString('po');
        minuend.subtractString('po');
        expect(minuend.raw).to.equal(aTable.raw);
      });

      it('of an adjacency table undoes addition', () => {
        const minuend = new AdjacencyTable(aTable.raw);
        minuend.addAdjacencyTable(subtrahend.raw);
        minuend.subtractAdjacencyTable(subtrahend.raw);
        expect(minuend.raw).to.equal(aTable.raw);
      });
    });
  });
});
