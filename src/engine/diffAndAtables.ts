import * as _ from 'lodash';

import addStringToDiff from '../string/addStringToDiff';
import AdjacencyTable from './adjacencyTable';
import Diff from '../string/diff';
import stringDiff, {DEFAULT_MIN_LENGTH} from '../string/stringDiff';
import match from '../string/match';
import {matches} from '../string/match';

export interface DiffAndAtables {
  START: AdjacencyTable | null;
  FINISH: AdjacencyTable | null;
  diff: Diff;
  maxLength: number;
  otherAtables: ReadonlyArray<AdjacencyTable>;
  strings: ReadonlyArray<string>;
}

interface DiffInfo {
  hasFinish: boolean;
  hasStart: boolean;
}

/**
 *
 * @param aTables The tables to select from
 * @param selector If this doesn't select an AdjacencyTable, all bets are off.
 * @param str The string to add.
 */
function addStringToAtable(aTables: DiffAndAtables, selector: string, str: string): void {
  const aTable = _.get(aTables, selector) as AdjacencyTable | null;
  if (aTable) {
    aTable.addString(str);
  } else {
    _.set(aTables, selector, new AdjacencyTable(str));
  }
}

function addStringsToAtables(
  aTables: DiffAndAtables,
  str: string,
  hasFinish: boolean,
  hasStart: boolean
): void {
  const matchResult = match(aTables.diff, str);

  if (!matchResult || !matchResult.isComplete) {
    return;
  }

  const end = matchResult.wildcardMatches.length - 1;

  let otherAtablesIndex = 0;

  matchResult.wildcardMatches.forEach((match, index) => {
    if (index === 0 && hasStart) {
      addStringToAtable(aTables, AdjacencyTable.START, match);
      return;
    }

    if (index === end && hasFinish) {
      addStringToAtable(aTables, AdjacencyTable.FINISH, match);
    } else {
      addStringToAtable(aTables, `otherAtables[${otherAtablesIndex}]`, match);
      otherAtablesIndex++;
    }
  });

  aTables.strings = [str, ...aTables.strings];
}

function diffInfo(aTables: DiffAndAtables): DiffInfo {
  const result = {
    hasFinish: false,
    hasStart: false
  };

  if (aTables.diff.length === 0) {
    return result;
  }

  result.hasStart = aTables.diff[0] === null;
  result.hasFinish = aTables.diff[aTables.diff.length - 1] === null;
  return result;
}

function confidenceFromStringList(aTables: DiffAndAtables, str: string): number {
  if (_.isEmpty(aTables.strings)) {
    return 0;
  }

  let highest = 0;
  aTables.strings.forEach(aTableString => {
    const diff = stringDiff(str, aTableString);
    highest = Math.max(confidenceFromStringDiff(diff, str), highest);
  });

  return highest;
}

function confidenceFromStringDiff(diff: Diff, str: string): number {
  const diffCharacterCount = diff
    .map(value => (value === null ? 0 : value.length))
    .reduce((previous, current) => current + previous, 0);
  return diffCharacterCount / str.length;
}

function updateMaxLength(aTables: DiffAndAtables): void {
  aTables.maxLength = Math.max(
    aTables.maxLength,
    aTables.strings.reduce((str, max) => (str.length > max.length ? str : max)).length
  );
}

export const DiffAndAtables = {
  addStrings: (
    aTables: DiffAndAtables,
    strings: string[],
    minLength: number = DEFAULT_MIN_LENGTH
  ): DiffAndAtables => {
    const rebuildAtables =
      aTables.diff.length === 0 || strings.some(str => !DiffAndAtables.test(aTables, str));

    if (rebuildAtables) {
      aTables = DiffAndAtables.fromStrings([...strings, ...aTables.strings], minLength);
    } else {
      const {hasFinish, hasStart} = diffInfo(aTables);
      strings.forEach(str => addStringsToAtables(aTables, str, hasFinish, hasStart));
    }

    updateMaxLength(aTables);

    return aTables;
  },

  confidenceFor: (aTables: DiffAndAtables, str: string): number => {
    if (aTables.diff.length === 0) {
      return confidenceFromStringList(aTables, str);
    }

    const matchResult = match(aTables.diff, str);

    if (!matchResult || !matchResult.isComplete) {
      return 0;
    }

    if (matchResult.wildcardMatches.length === 0) {
      return 1;
    }

    const end = matchResult.wildcardMatches.length - 1;

    let cumulativeProbability = 0;
    let otherAtablesIndex = 0;

    matchResult.wildcardMatches.forEach((match, index) => {
      if (index === 0 && aTables.START) {
        cumulativeProbability += aTables.START.confidenceFor(match);
        return;
      }

      if (index === end && aTables.FINISH) {
        cumulativeProbability += aTables.FINISH.confidenceFor(match);
      } else {
        if (aTables.otherAtables[otherAtablesIndex]) {
          cumulativeProbability += aTables.otherAtables[otherAtablesIndex].confidenceFor(match);
        }
        otherAtablesIndex++;
      }
    });

    return cumulativeProbability / matchResult.wildcardMatches.length;
  },

  emptyAtables: (): DiffAndAtables => {
    return {
      FINISH: null,
      START: null,
      diff: [],
      maxLength: 0,
      otherAtables: [],
      strings: []
    };
  },

  fromStrings: (
    strings: ReadonlyArray<string>,
    minLength: number = DEFAULT_MIN_LENGTH
  ): DiffAndAtables => {
    const aTables = DiffAndAtables.emptyAtables();
    aTables.strings = strings;

    strings.forEach((str, index) => {
      aTables.maxLength = Math.max(aTables.maxLength, str.length);
      switch (index) {
        case 0:
          break;
        case 1:
          aTables.diff = stringDiff(strings[0], str, minLength);
          break;
        default:
          aTables.diff = addStringToDiff(aTables.diff, str, minLength);
      }
    });

    if (strings.length < 2) {
      return aTables;
    }

    const {hasFinish, hasStart} = diffInfo(aTables);

    strings.forEach(str => {
      addStringsToAtables(aTables, str, hasFinish, hasStart);
    });

    return aTables;
  },

  removeStrings: (
    aTables: DiffAndAtables,
    strings: string[],
    minLength: number = DEFAULT_MIN_LENGTH
  ): DiffAndAtables => {
    const newStrings: string[] = [...aTables.strings];
    strings.forEach(str => {
      const index = newStrings.indexOf(str);

      if (index !== -1) {
        newStrings.splice(index, 1);
      }
    });

    aTables = DiffAndAtables.fromStrings(newStrings, minLength);
    return aTables;
  },

  test: (aTables: DiffAndAtables, str: string): boolean =>
    aTables.strings.length <= 1 || matches(aTables.diff, str)
};
