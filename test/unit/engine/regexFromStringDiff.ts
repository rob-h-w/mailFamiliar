import {expect} from 'code';
const {describe, it} = (exports.lab = require('lab').script());

import regexFromStringDiff from '../../../src/engine/regexFromStringDiff';

describe('stringDiff', () => {
  it('constructs an empty regex from an empty diff', () => {
    expect(regexFromStringDiff([])).to.equal(new RegExp(''));
  });

  it('constructs the expected regex', () => {
    expect(regexFromStringDiff([null, 'abc', null])).to.equal(/(.+)abc(.+)/);
  });
});
