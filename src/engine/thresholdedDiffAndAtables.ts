import {List} from 'immutable';

import {DiffAndAtables} from './diffAndAtables';
import MIN_SEGMENT_LENGTHS from './segmentLengths';
import addStringToDiff from './addStringToDiff';
import stringDiff from './stringDiff';

interface ThresholdedDiffCollection {
  [index: number]: List<DiffAndAtables>;
}

const MAX_REDUCER = (max: number, candidate: number) => Math.max(max, candidate);
const MIN_CONFIDENCE = 0.1;
const MIN_EQUALITY = 0.01;

export default class ThresholdedDiffAndAtables {
  private readonly diffs: ThresholdedDiffCollection;

  constructor(strings: string[]) {
    this.diffs = {};
    MIN_SEGMENT_LENGTHS.map(
      segLength => (this.diffs[segLength] = List.of(DiffAndAtables.emptyAtables()))
    );
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
    diffAndAtablesList: List<DiffAndAtables>,
    segLength: number,
    strVal: string
  ): List<DiffAndAtables> {
    let newVal: DiffAndAtables | null = null;
    let replacementIndex = 0;
    let replacementCandidateFound = false;

    let highestConfidence = 0;

    diffAndAtablesList.forEach((diffAndAtable, index) => {
      const confidence = DiffAndAtables.confidenceFor(diffAndAtable, strVal);
      if (confidence > highestConfidence) {
        highestConfidence = confidence;
        replacementIndex = index;
        replacementCandidateFound = true;
      }
    });

    if (highestConfidence < MIN_CONFIDENCE) {
      replacementCandidateFound = false;
    }

    if (replacementCandidateFound) {
      const candidateDiffAndAtable = diffAndAtablesList.get(replacementIndex);
      if (
        candidateDiffAndAtable &&
        this.isWithinThreshold(candidateDiffAndAtable, strVal, segLength)
      ) {
        newVal = DiffAndAtables.addStrings(candidateDiffAndAtable, [strVal], segLength);
      }
    }

    return newVal
      ? diffAndAtablesList.update(replacementIndex, () => newVal as DiffAndAtables)
      : diffAndAtablesList.push(DiffAndAtables.fromStrings([strVal], segLength));
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
      this.diffs[segLength] = diffAndAtablesList.delete(removalIndex);
    } else {
      const newDiffs = removeFrom.strings.filter(s => s !== strVal);
      this.diffs[segLength] = diffAndAtablesList.update(removalIndex, () =>
        DiffAndAtables.fromStrings(newDiffs)
      );
    }
  }

  private containsString(strVal: string): boolean {
    return MIN_SEGMENT_LENGTHS.map(segLength => this.diffs[segLength]).some(diffList =>
      diffList.some(diffAndATable => diffAndATable.strings.indexOf(strVal) !== -1)
    );
  }

  private isWithinThreshold(daa: DiffAndAtables, candidate: string, segLength: number): boolean {
    if (candidate.length === 0 || daa.strings.length === 0) {
      return true;
    }

    if (daa.strings.length === 1) {
      return this.diffIsWithinThreshold(stringDiff(daa.strings[0], candidate), candidate);
    }

    const newDiff = addStringToDiff(daa.diff, candidate, segLength);
    if (newDiff.length === 0 || (newDiff.length === 1 && newDiff[0] === null)) {
      return false;
    }

    return this.diffIsWithinThreshold(newDiff, candidate);
  }

  private diffIsWithinThreshold(diff: ReadonlyArray<string | null>, candidate: string): boolean {
    return this.countCharacters(diff) / candidate.length > MIN_EQUALITY;
  }

  private countCharacters(diff: ReadonlyArray<string | null>) {
    return diff.map(val => (val ? val.length : 0)).reduce((sum, val) => sum + val, 0);
  }
}
