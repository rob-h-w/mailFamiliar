import {expect} from '@hapi/code';
const {describe, it} = (exports.lab = require('@hapi/lab').script());

import regexFromStringDiff from '../../../src/engine/regexFromStringDiff';

describe('stringDiff', () => {
  it('constructs an empty regex from an empty diff', () => {
    expect(regexFromStringDiff([])).to.equal(new RegExp('', 'ms'));
  });

  it('constructs the expected regex', () => {
    expect(regexFromStringDiff([null, 'abc', null])).to.equal(/(.+)abc(.+)/ms);
  });

  it('constructs a regex that matches multiline text correctly', () => {
    const regex = regexFromStringDiff(['\r\nsnoots[', null, ']abc\r\nn']);
    expect(regex.test('\r\nsnoots[hoots\r\nMcGee]abc\r\nn')).to.be.true();
  });
});
