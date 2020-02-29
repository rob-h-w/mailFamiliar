import {Map as ImMap} from 'immutable';

import Box from './box';
import Predictor from './predictor';
import {crossCorrelateStrings} from '../tools/crossCorrelate';

const MODE_SLOTS = 100;

interface ModeRange {
  from: number;
  to: number;
}

function toMode(range: ModeRange): number {
  const step = range.to - range.from;
  return range.from + step / 2;
}

export default class CrossCorrelate implements Predictor {
  private readonly boxToHeaders: Map<string, Array<string>>;

  constructor() {
    this.boxToHeaders = new Map();
  }

  addHeaders(headers: string, qualifiedBoxName: string): void {
    const headersList = this.getHeaders(qualifiedBoxName);
    headersList.push(headers);
    this.boxToHeaders.set(qualifiedBoxName, headersList);
  }

  considerBox(box: Box): void {
    for (const message of box.messages) {
      this.addHeaders(message.headers, box.qualifiedName);
    }
  }

  folderScore(headers: string): ImMap<string, number> {
    const result: {[key: string]: number} = {};

    for (const [qualifiedName, headersList] of this.boxToHeaders.entries()) {
      result[qualifiedName] = this.entryScore(headers, headersList);
    }

    return ImMap(result);
  }

  private entryScore(headers: string, headersList: ReadonlyArray<string>): number {
    const [scores, minimum, maximum] = CrossCorrelate.scoreStatsFrom(headersList, headers);

    // If we can't score (because, perhaps the folder is empty) just return 0 confidence.
    if (scores.length === 0) {
      return 0;
    }

    const ranges = CrossCorrelate.rangesFrom(minimum, maximum);

    // Shortcut in case we've found a perfect match.
    if (minimum === 0) {
      return 1;
    }

    // If there's no range, just return the first score.
    if (ranges.length === 0) {
      return scores[0];
    }

    const modeRangeIndexToCount: Map<
      number,
      number
    > = CrossCorrelate.getRangeIndicesToIncidenceCount(ranges, scores);

    let modeRange: ModeRange = ranges[0];
    let max = 0;
    modeRangeIndexToCount.forEach((count, rangeIndex) => {
      if (count > max) {
        modeRange = ranges[rangeIndex];
        max = count;
      }
    });

    return 1 - toMode(modeRange);
  }

  private static getRangeIndicesToIncidenceCount(
    ranges: ReadonlyArray<ModeRange>,
    scores: ReadonlyArray<number>
  ): Map<number, number> {
    const modeRangeIndexToCount: Map<number, number> = new Map();
    for (const score of scores) {
      const modeRangeIndex = Math.max(
        0,
        ranges.findIndex(range => range.from < score && range.to >= score)
      );
      const count = modeRangeIndexToCount.get(modeRangeIndex) || 0;
      modeRangeIndexToCount.set(modeRangeIndex, count + 1);
    }
    return modeRangeIndexToCount;
  }

  private getHeaders(qualifiedName: string): Array<string> {
    return this.boxToHeaders.get(qualifiedName) || [];
  }

  name(): string {
    return 'cross correlate';
  }

  private static rangesFrom(minimum: number, maximum: number): ReadonlyArray<ModeRange> {
    const step = (maximum - minimum) / MODE_SLOTS;
    const ranges: Array<ModeRange> = [];
    for (let i = minimum; i < maximum; i += step) {
      ranges.push({from: i, to: i + step});
    }
    return ranges;
  }

  removeHeaders(headers: string, qualifiedBoxName: string): void {
    const headersList = this.getHeaders(qualifiedBoxName);
    const index = headersList.indexOf(headers);

    if (index === -1) {
      return;
    }

    headersList.splice(index, 1);
    this.boxToHeaders.set(qualifiedBoxName, headersList);
  }

  private static scoreStatsFrom(
    headersList: ReadonlyArray<string>,
    headers: string
  ): [ReadonlyArray<number>, number, number] {
    const scores = [];
    let minimum = 1;
    let maximum = 0;
    for (const encounteredHeader of headersList) {
      const result = crossCorrelateStrings(Array.from(encounteredHeader), Array.from(headers));
      if (result) {
        minimum = Math.min(minimum, result.score);
        maximum = Math.max(maximum, result.score);
        scores.push(result.score);
      }
    }

    return [scores, minimum, maximum];
  }
}
