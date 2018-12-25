import {expect} from 'code';
const {beforeEach, describe, it} = (exports.lab = require('lab').script());

import Box from '../../../src/engine/box';

describe('Box', () => {
  let box: Box;

  beforeEach(() => {
    box = new Box({
      adjacencyTable: {
        table: {},
        totalSampleLength: 0,
        totalSamples: 0
      },
      name: 'test',
      qualifiedName: 'folder/test',
      syncedTo: 1
    });
  });

  it('is not an inbox', () => {
    expect(box.isInbox).to.be.false();
  });

  it('has an adjacency table', () => {
    const aTable = box.adjacencyTable;
    expect(aTable).to.exist();
    expect<{[key: string]: number}>(aTable.table).to.equal({});
    expect(aTable.totalSampleLength).to.equal(0);
    expect(aTable.totalSamples).to.equal(0);
  });
});
