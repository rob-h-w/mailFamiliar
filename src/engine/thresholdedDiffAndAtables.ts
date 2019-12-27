import Diff from '../string/diff';
import {DiffAndAtables} from './diffAndAtables';
import MIN_SEGMENT_LENGTHS from './segmentLengths';
import {matches} from '../string/match';
import stringDiff from '../string/stringDiff';

interface ThresholdedDiffCollection {
  [index: number]: DiffAndAtables[];
}

const BUCKET_SIZE = 50;
const MAX_REDUCER = (max: number, candidate: number) => Math.max(max, candidate);
const MIN_CONFIDENCE = 0.5;
const MIN_EQUALITY = 0.02;

export default class ThresholdedDiffAndAtables {
  private readonly diffs: ThresholdedDiffCollection;

  constructor(strings: string[]) {
    this.diffs = {};
    MIN_SEGMENT_LENGTHS.map(segLength => (this.diffs[segLength] = []));
    this.addStrings(strings);
  }

  addStrings(strings: ReadonlyArray<string>) {
    strings.forEach(this.addString.bind(this));
  }

  private addString(strVal: string) {
    if (this.containsString(strVal)) {
      return;
    }

    MIN_SEGMENT_LENGTHS.forEach(segLength => this.addStringToSegLength(strVal, segLength));
  }

  private addStringToSegLength(strVal: string, segLength: number) {
    this.diffs[segLength] = this.withString(this.diffs[segLength], segLength, strVal);
  }

  private withString(
    diffAndAtablesList: DiffAndAtables[],
    segLength: number,
    strVal: string
  ): DiffAndAtables[] {
    let newVal: DiffAndAtables | null = null;
    let index = 0;
    let replacementIndex = -1;

    let highestConfidence = 0;

    for (const diffAndAtable of diffAndAtablesList) {
      const length = diffAndAtable.strings.length;

      if (length < BUCKET_SIZE) {
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
        newVal = this.isWithinThreshold(newVal, strVal) ? newVal : null;
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
      .map(diff => this.confidenceForDiff(diff, strVal, segLength))
      .reduce(MAX_REDUCER, 0);
  }

  private confidenceForDiff(diff: DiffAndAtables, strVal: string, segLength: number): number {
    const naiveConfidence = DiffAndAtables.confidenceFor(diff, strVal);

    if (!naiveConfidence) {
      return 0;
    }

    const hypotheticallyAddedTdaat = DiffAndAtables.addStrings(diff, [strVal], segLength);
    const matchingCharacters = this.countCharacters(hypotheticallyAddedTdaat.diff);
    const nonMatchingCharacters = strVal.length - matchingCharacters;

    return (matchingCharacters + naiveConfidence * nonMatchingCharacters) / strVal.length;
  }

  removeStrings(strings: string[]) {
    strings.forEach(this.removeString.bind(this));
  }

  private removeString(strVal: string) {
    if (!this.containsString(strVal)) {
      return;
    }

    MIN_SEGMENT_LENGTHS.forEach(segLength => this.removeStringFromSegLength(strVal, segLength));
  }

  private removeStringFromSegLength(strVal: string, segLength: number) {
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

  private isWithinThreshold(daa: DiffAndAtables, candidate: string): boolean {
    if (candidate.length === 0 || daa.strings.length === 0) {
      return true;
    }

    if (daa.strings.length === 1) {
      return this.diffIsWithinThreshold(stringDiff(daa.strings[0], candidate), candidate);
    }

    const newDiff = daa.diff;
    if (newDiff.length === 0 || (newDiff.length === 1 && newDiff[0] === null)) {
      return false;
    }

    return this.diffIsWithinThreshold(newDiff, candidate);
  }

  private diffIsWithinThreshold(diff: Diff, candidate: string): boolean {
    return this.countCharacters(diff) / candidate.length > MIN_EQUALITY;
  }

  private countCharacters(diff: Diff) {
    return diff.map(val => (val ? val.length : 0)).reduce((sum, val) => sum + val, 0);
  }
}
