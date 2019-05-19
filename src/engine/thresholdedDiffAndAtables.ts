import {List} from 'immutable';

import {DiffAndAtables} from './diffAndAtables';
import MIN_SEGMENT_LENGTHS from './segmentLengths';

interface ThresholdedDiffCollection {
  [index: number]: List<DiffAndAtables>;
}

const MAX_REDUCER = (max: number, candidate: number) => (candidate > max ? candidate : max);
const MIN_EQUALITY = 0.1;

export default class ThresholdedDiffAndAtables {
  private readonly diffs: ThresholdedDiffCollection;

  constructor(strings: string[]) {
    this.diffs = {};
    MIN_SEGMENT_LENGTHS.map(
      segLength => (this.diffs[segLength] = List.of(DiffAndAtables.emptyAtables()))
    );
    this.addStrings(strings);
  }

  addStrings(strings: string[]) {
    strings.forEach(this.addString.bind(this));
  }

  private addString(strVal: string) {
    if (this.containsString(strVal)) {
      return;
    }

    MIN_SEGMENT_LENGTHS.forEach(segLength => this.addStringToSegLength(strVal, segLength));
  }

  private addStringToSegLength(strVal: string, segLength: number) {
    const diffAndAtablesList = this.diffs[segLength];

    const replacementAndIndex = this.getReplacementAndIndex(diffAndAtablesList, segLength, strVal);

    if (replacementAndIndex.value === null) {
      this.diffs[segLength] = diffAndAtablesList.push(
        DiffAndAtables.fromStrings([strVal], segLength)
      );
    } else {
      this.diffs[segLength] = diffAndAtablesList.update(
        replacementAndIndex.index,
        () => replacementAndIndex.value as DiffAndAtables
      );
    }
  }

  private getReplacementAndIndex(
    diffAndAtablesList: List<DiffAndAtables>,
    segLength: number,
    strVal: string
  ): {value: DiffAndAtables | null; index: number} {
    let candidateDiffAndAtableReplacement: DiffAndAtables | null = null;
    let replacementIndex = -1;

    diffAndAtablesList.find((diffAndAtable, index) => {
      const candidateStringArray = diffAndAtable.strings.concat(strVal);
      candidateDiffAndAtableReplacement = DiffAndAtables.fromStrings(
        candidateStringArray,
        segLength
      );

      if (this.isWithinThreshold(candidateDiffAndAtableReplacement.diff, strVal)) {
        replacementIndex = index;
        return true;
      } else {
        candidateDiffAndAtableReplacement = null;
        return false;
      }
    });

    return {value: candidateDiffAndAtableReplacement, index: replacementIndex};
  }

  confidenceFor(strVal: string): number {
    return MIN_SEGMENT_LENGTHS.map(segLength =>
      this.confidenceForSegLength(strVal, segLength)
    ).reduce(MAX_REDUCER, 0);
  }

  private confidenceForSegLength(strVal: string, segLength: number): number {
    return this.diffs[segLength]
      .map(diff => DiffAndAtables.confidenceFor(diff, strVal))
      .reduce(MAX_REDUCER, 0);
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

  private isWithinThreshold(diff: ReadonlyArray<string | null>, candidate: string): boolean {
    if (candidate.length === 0) {
      return true;
    }

    return (
      diff.map(val => (val ? val.length : 0)).reduce((sum, val) => sum + val, 0) /
        candidate.length >
      MIN_EQUALITY
    );
  }
}
