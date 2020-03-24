import {expect} from '@hapi/code';
const {before, describe, it} = (exports.lab = require('@hapi/lab').script());
import * as _ from 'lodash';
// import * as mockery from 'mockery';
// import * as sinon from 'sinon';

import {
  messages,
  name,
  qualifiedName,
  syncedTo
} from '../../fixtures/standard/daily mash cec0298eff997b53eeb8d2120a544de1d49a2729fd9ad4fe108f76e62b991d58.json';

import Box from '../../../../src/engine/box';
import {DiffAndAtables} from '../../../../src/engine/diffAndAtables';
import ThresholdedRegexAndAtable from '../../../../src/engine/thresholdedRegexAndAtable';
import ThresholdedDiffAndAtables from '../../../../src/engine/thresholdedDiffAndAtables';

describe('ThresholdedRegexAndAtable categorization', () => {
  let predictor: ThresholdedRegexAndAtable;
  let diffs: DiffAndAtables[];

  before(() => {
    predictor = new ThresholdedRegexAndAtable();
    const box = new Box({name, qualifiedName, syncedTo});
    predictor.considerBox(box);
    messages.forEach(message => predictor.addHeaders(message.headers, name));
    const thresholdedDiffAndAtables = _.get(predictor, 'boxMap').get(
      name
    ) as ThresholdedDiffAndAtables;
    diffs = _.get(thresholdedDiffAndAtables, 'diffs.2') as DiffAndAtables[];
  });

  it('produces a good quantity of identical characters', () => {
    const totalStringLength: number = diffs
      .map(diff =>
        diff.diff
          .filter(str => str !== null)
          .map(str => str?.length)
          .reduce((previous, length) => (previous || 0) + (length || 0), 0)
      )
      .reduce((previous, length) => (previous || 0) + (length || 0), 0) as number;
    const meanStringLength: number = totalStringLength / diffs.length;

    expect(meanStringLength).to.be.greaterThan(200);
  });

  it('produces minimal unit categories', () => {
    const unitCount: number = diffs
      .map(diff => (diff.strings.length === 1 ? 1 : 0) as number)
      .reduce((previous, length) => previous + length, 0);

    expect(unitCount).to.be.lessThan(10);
  });
});
