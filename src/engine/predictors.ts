import {Literal, Static, Union} from 'runtypes';

import Predictor from './predictor';
import CrossCorrelate from './crossCorrelate';
import RegexAndAtable from './regexAndAtable';
import ThresholdedRegexAndAtable from './thresholdedRegexAndAtable';

export const PredictorTypeValues = Union(
  Literal('CrossCorrelate'),
  Literal('RegexAndAtable'),
  Literal('Traat')
);
export type PredictorType = Static<typeof PredictorTypeValues>;

type Ctor = () => Predictor;

const predictorConstructors: Map<PredictorType, Ctor> = new Map([
  ['CrossCorrelate', (): Predictor => new CrossCorrelate()],
  ['RegexAndAtable', (): Predictor => new RegexAndAtable()],
  ['Traat', (): Predictor => new ThresholdedRegexAndAtable()],
] as [PredictorType, Ctor][]);

export function create(): Map<PredictorType, Predictor> {
  const result = new Map();
  predictorConstructors.forEach((value, key) => result.set(key, value()));
  return result;
}
