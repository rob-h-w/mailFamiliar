import {expect} from '@hapi/code';
const {beforeEach, describe, it} = (exports.lab = require('@hapi/lab').script());

import Box from '../../../src/engine/box';

describe('Box', () => {
  let box: Box;

  beforeEach(() => {
    box = new Box({
      name: 'test',
      qualifiedName: 'folder/test',
      syncedTo: 1
    });
  });

  it('is not an inbox', () => {
    expect(box.isInbox).to.be.false();
  });
});
