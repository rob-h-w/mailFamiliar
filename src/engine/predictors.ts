import {Map} from 'immutable';
import {Literal, Static, Union} from 'runtypes';

import IPredictor from './predictor';
import CrossCorrelate from './crossCorrelate';
import RegexAndAtable from './regexAndAtable';
import ThresholdedRegexAndAtable from './thresholdedRegexAndAtable';

export const PredictorTypeValues = Union(
  Literal('CrossCorrelate'),
  Literal('RegexAndAtable'),
  Literal('Traat')
);
export type PredictorType = Static<typeof PredictorTypeValues>;

type Ctor = () => IPredictor;

const predictorConstructors: Map<PredictorType, Ctor> = Map([
  ['CrossCorrelate', () => new CrossCorrelate()],
  ['RegexAndAtable', () => new RegexAndAtable()],
  ['Traat', () => new ThresholdedRegexAndAtable()]
] as [PredictorType, Ctor][]);

export function create(): Map<PredictorType, IPredictor> {
  return predictorConstructors.map(ctor => ctor());
}
