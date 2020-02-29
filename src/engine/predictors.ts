import {Map} from 'immutable';
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

const predictorConstructors: Map<PredictorType, Ctor> = Map([
  ['CrossCorrelate', (): Predictor => new CrossCorrelate()],
  ['RegexAndAtable', (): Predictor => new RegexAndAtable()],
  ['Traat', (): Predictor => new ThresholdedRegexAndAtable()]
] as [PredictorType, Ctor][]);

export function create(): Map<PredictorType, Predictor> {
  return predictorConstructors.map(ctor => ctor());
}
