import {expect} from 'code';
const {beforeEach, describe, it} = (exports.lab = require('lab').script());

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

    it('calculates the correct probability of 1 letter given another', () => {
      expect(aTable.pAThenB('o', 'o')).to.equal(2 / 3);
      expect(aTable.pAThenB('p', 'o')).to.equal(1);
      expect(aTable.pAThenB('o', 'p')).to.equal(0);
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
  });
});
