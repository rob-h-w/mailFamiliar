import * as _ from 'lodash';

import addStringToDiff from './addStringToDiff';
import AdjacencyTable from './adjacencyTable';
import regexFromStringDiff from './regexFromStringDiff';
import stringDiff, {DEFAULT_MIN_LENGTH} from './stringDiff';

export interface DiffAndAtables {
  START: AdjacencyTable | null;
  FINISH: AdjacencyTable | null;
  diff: ReadonlyArray<string | null>;
  headersList: ReadonlyArray<string>;
  otherAtables: ReadonlyArray<AdjacencyTable>;
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
function addStringToAtable(aTables: DiffAndAtables, selector: string, str: string) {
  const aTable = _.get(aTables, selector) as AdjacencyTable | null;
  if (aTable) {
    aTable.addString(str);
  } else {
    _.set(aTables, selector, new AdjacencyTable(str));
  }
}

function addHeadersToAtables(
  aTables: DiffAndAtables,
  headers: string,
  regex: RegExp,
  hasFinish: boolean,
  hasStart: boolean
) {
  if (regex.source === '(?:)') {
    // The regex matches everything. Add these headers to the start.
    addStringToAtable(aTables, AdjacencyTable.START, headers);
    return;
  }

  const matches = regex.exec(headers);

  if (!matches) {
    return;
  }

  const end = matches.length - 1;

  let otherAtablesIndex = 0;

  matches.forEach((match, index) => {
    if (index === 0) {
      return;
    }

    if (index === 1 && hasStart) {
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

export const DiffAndAtables = {
  addHeadersList: (
    aTables: DiffAndAtables,
    headersList: string[],
    minLength: number = DEFAULT_MIN_LENGTH
  ): DiffAndAtables => {
    const regex = regexFromStringDiff(aTables.diff);
    const rebuildAtables =
      aTables.diff.length === 0 || headersList.some(headers => !regex.test(headers));

    if (rebuildAtables) {
      aTables = DiffAndAtables.fromHeaders([...headersList, ...aTables.headersList], minLength);
    } else {
      const {hasFinish, hasStart} = diffInfo(aTables);
      headersList.forEach(headers =>
        addHeadersToAtables(aTables, headers, regex, hasFinish, hasStart)
      );
    }

    return aTables;
  },

  confidenceFor: (aTables: DiffAndAtables, headers: string): number => {
    if (aTables.diff.length === 0) {
      return 0;
    }

    const regex = regexFromStringDiff(aTables.diff);
    const matches = regex.exec(headers);

    if (!matches) {
      return 0;
    }

    if (matches.length === 1 && matches[0].length > 0) {
      // There is only 1 match, so the regex has no parentheses.
      return 1;
    }

    const end = matches.length - 1;
    const measurements = end; // Skip the first match because it's the whole string.

    let cumulativeProbability = 0;
    let otherAtablesIndex = 0;

    matches.forEach((match, index) => {
      if (index === 0) {
        return;
      }

      if (index === 1 && aTables.START) {
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

    return cumulativeProbability / measurements;
  },

  emptyAtables: (): DiffAndAtables => {
    return {
      FINISH: null,
      START: null,
      diff: [],
      headersList: [],
      otherAtables: []
    };
  },

  fromHeaders: (
    headersList: ReadonlyArray<string>,
    minLength: number = DEFAULT_MIN_LENGTH
  ): DiffAndAtables => {
    const aTables = DiffAndAtables.emptyAtables();
    aTables.headersList = headersList;

    headersList.forEach((headers, index) => {
      switch (index) {
        case 0:
          break;
        case 1:
          aTables.diff = stringDiff(headersList[0], headers, minLength);
          break;
        default:
          aTables.diff = addStringToDiff(aTables.diff, headers, minLength);
      }
    });

    if (headersList.length < 2) {
      return aTables;
    }

    const {hasFinish, hasStart} = diffInfo(aTables);
    const regex = regexFromStringDiff(aTables.diff);

    headersList.forEach(headers => {
      addHeadersToAtables(aTables, headers, regex, hasFinish, hasStart);
    });

    return aTables;
  },

  removeHeadersList: (
    aTables: DiffAndAtables,
    headersList: string[],
    minLength: number = DEFAULT_MIN_LENGTH
  ): DiffAndAtables => {
    const newHeadersList: string[] = [...aTables.headersList];
    headersList.forEach(headers => {
      const index = newHeadersList.indexOf(headers);

      if (index !== -1) {
        newHeadersList.splice(index, 1);
      }
    });

    aTables = DiffAndAtables.fromHeaders(newHeadersList, minLength);
    return aTables;
  }
};
