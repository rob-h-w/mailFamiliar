import Diff from '../string/diff';
import {DiffAndAtables} from './diffAndAtables';
import MIN_SEGMENT_LENGTHS from './segmentLengths';
import {matches} from '../string/match';
import stringDiff from '../string/stringDiff';

interface ThresholdedDiffCollection {
  [index: number]: DiffAndAtables[];
}

const MAX_REDUCER = (max: number, candidate: number): number => Math.max(max, candidate);
const MAX_SIMILARITY = 0.05;
const MIN_CONFIDENCE = 0.8;
const MIN_EQUALITY = 0.01;

export default class ThresholdedDiffAndAtables {
  private readonly diffs: ThresholdedDiffCollection;

  constructor(strings: string[]) {
    this.diffs = {};
    MIN_SEGMENT_LENGTHS.map(segLength => (this.diffs[segLength] = []));
    this.addStrings(strings);
  }

  addStrings(strings: ReadonlyArray<string>): void {
    strings.forEach(this.addString.bind(this));
  }

  private addString(strVal: string): void {
    if (this.containsString(strVal)) {
      return;
    }

    MIN_SEGMENT_LENGTHS.forEach(segLength => this.addStringToSegLength(strVal, segLength));
  }

  private addStringToSegLength(strVal: string, segLength: number): void {
    this.diffs[segLength] = ThresholdedDiffAndAtables.withString(
      this.diffs[segLength],
      segLength,
      strVal
    );
  }

  private static similarity(diffAndAtable: DiffAndAtables): number {
    if (diffAndAtable.strings.length === 1) {
      return 1;
    }

    if (diffAndAtable.maxLength === 0) {
      return 0;
    }

    return this.countCharacters(diffAndAtable.diff) / diffAndAtable.maxLength;
  }

  private static withString(
    diffAndAtablesList: DiffAndAtables[],
    segLength: number,
    strVal: string
  ): DiffAndAtables[] {
    let newVal: DiffAndAtables | null = null;
    let index = 0;
    let replacementIndex = -1;

    let highestConfidence = 0;

    for (const diffAndAtable of diffAndAtablesList) {
      if (ThresholdedDiffAndAtables.similarity(diffAndAtable) > MAX_SIMILARITY) {
        highestConfidence = 1;
        replacementIndex = index;
        break;
      }

      if (matches(diffAndAtable.diff, strVal)) {
        const confidence = DiffAndAtables.confidenceFor(diffAndAtable, strVal);
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          replacementIndex = index;
        }
      }

      index++;
    }

    if (highestConfidence < MIN_CONFIDENCE) {
      replacementIndex = -1;
    }

    if (replacementIndex !== -1) {
      const candidateDiffAndAtable = diffAndAtablesList[replacementIndex];
      if (candidateDiffAndAtable) {
        newVal = DiffAndAtables.addStrings(candidateDiffAndAtable, [strVal], segLength);
        newVal = ThresholdedDiffAndAtables.isWithinThreshold(newVal, strVal) ? newVal : null;
      }
    }

    if (newVal) {
      diffAndAtablesList[replacementIndex] = newVal as DiffAndAtables;
    } else {
      diffAndAtablesList.push(DiffAndAtables.fromStrings([strVal], segLength));
    }

    return diffAndAtablesList;
  }

  confidenceFor(strVal: string): number {
    return MIN_SEGMENT_LENGTHS.map(segLength =>
      this.confidenceForSegLength(strVal, segLength)
    ).reduce(MAX_REDUCER, 0);
  }

  private confidenceForSegLength(strVal: string, segLength: number): number {
    return this.diffs[segLength]
      .map(diff => ThresholdedDiffAndAtables.confidenceForDiff(diff, strVal, segLength))
      .reduce(MAX_REDUCER, 0);
  }

  private static confidenceForDiff(
    diff: DiffAndAtables,
    strVal: string,
    segLength: number
  ): number {
    const naiveConfidence = DiffAndAtables.confidenceFor(diff, strVal);

    if (!naiveConfidence) {
      return 0;
    }

    const hypotheticallyAddedTdaat = DiffAndAtables.addStrings(diff, [strVal], segLength);
    const matchingCharacters = ThresholdedDiffAndAtables.countCharacters(
      hypotheticallyAddedTdaat.diff
    );
    const nonMatchingCharacters = strVal.length - matchingCharacters;

    return (matchingCharacters + naiveConfidence * nonMatchingCharacters) / strVal.length;
  }

  removeStrings(strings: string[]): void {
    strings.forEach(this.removeString.bind(this));
  }

  private removeString(strVal: string): void {
    if (!this.containsString(strVal)) {
      return;
    }

    MIN_SEGMENT_LENGTHS.forEach(segLength => this.removeStringFromSegLength(strVal, segLength));
  }

  private removeStringFromSegLength(strVal: string, segLength: number): void {
    const diffAndAtablesList = this.diffs[segLength];
    let removalIndex = -1;
    const removeFrom: DiffAndAtables = diffAndAtablesList.find((diffAndAtables, index) => {
      if (diffAndAtables.strings.indexOf(strVal) !== -1) {
        removalIndex = index;
        return true;
      }

      return false;
    }) as DiffAndAtables; // Cannot be undefined.

    // Remove empty diff and adjacency tables except the first one. There must be at least one.
    if (removeFrom.diff.length === 1 && removalIndex !== 0) {
      diffAndAtablesList.splice(removalIndex, 1);
    } else {
      const newDiffs = removeFrom.strings.filter(s => s !== strVal);
      diffAndAtablesList[removalIndex] = DiffAndAtables.fromStrings(newDiffs);
    }
  }

  private containsString(strVal: string): boolean {
    return MIN_SEGMENT_LENGTHS.map(segLength => this.diffs[segLength]).some(diffList =>
      diffList.some(diffAndATable => diffAndATable.strings.indexOf(strVal) !== -1)
    );
  }

  private static isWithinThreshold(daa: DiffAndAtables, candidate: string): boolean {
    if (candidate.length === 0 || daa.strings.length === 0) {
      return true;
    }

    if (daa.strings.length === 1) {
      return ThresholdedDiffAndAtables.diffIsWithinThreshold(
        stringDiff(daa.strings[0], candidate),
        candidate
      );
    }

    const newDiff = daa.diff;
    if (newDiff.length === 0 || (newDiff.length === 1 && newDiff[0] === null)) {
      return false;
    }

    return ThresholdedDiffAndAtables.diffIsWithinThreshold(newDiff, candidate);
  }

  private static diffIsWithinThreshold(diff: Diff, candidate: string): boolean {
    return ThresholdedDiffAndAtables.countCharacters(diff) / candidate.length > MIN_EQUALITY;
  }

  private static countCharacters(diff: Diff): number {
    return diff.map(val => (val ? val.length : 0)).reduce((sum, val) => sum + val, 0);
  }
}
