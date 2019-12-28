import Diff from './diff';

interface MatchResult {
  isComplete: boolean;
  remainder: string;
  wildcardMatches: ReadonlyArray<string>;
}

function chopOutSearchString(
  remainder: string,
  searchString: string
): {leadingWildCard: string; newRemainder: string} | null {
  const index = remainder.indexOf(searchString);

  if (index === -1) {
    return null;
  }

  return {
    leadingWildCard: remainder.substring(0, index),
    newRemainder: remainder.slice(index + searchString.length)
  };
}

export default function match(diff: Diff, str: string): MatchResult {
  if (diff.length === 0) {
    return {
      isComplete: false,
      remainder: str,
      wildcardMatches: []
    };
  }

  let hasNulls = false;
  let isComplete = true;
  let isFirstNull = true;
  let lastWasNull = false;
  let remainder = str;
  let searchString = null;

  const wildcardMatches = [];

  for (const element of diff) {
    if (element === null) {
      hasNulls = true;
      const first = isFirstNull;
      isFirstNull = false;
      lastWasNull = true;

      if (searchString) {
        const chopResult = chopOutSearchString(remainder, searchString);

        if (!chopResult) {
          isComplete = false;
          break;
        }

        if (!first) {
          wildcardMatches.push(chopResult.leadingWildCard);
        }

        remainder = chopResult.newRemainder;
      }
    } else {
      lastWasNull = false;
      searchString = element;
    }
  }

  if (lastWasNull) {
    wildcardMatches.push(remainder);
  } else {
    const chopResult = chopOutSearchString(remainder, diff[diff.length - 1] as string);
    if (chopResult) {
      if (chopResult.newRemainder.length !== 0) {
        isComplete = false;
      }

      if (hasNulls) {
        wildcardMatches.push(chopResult.leadingWildCard);
      }

      remainder = chopResult.newRemainder;
    } else {
      isComplete = false;
    }
  }

  if (isComplete || lastWasNull) {
    remainder = '';
  }

  return {
    isComplete,
    remainder,
    wildcardMatches
  };
}

export function matches(diff: Diff, str: string): boolean {
  if (diff.length === 0) {
    return false;
  }

  let lastWasNull = false;
  let remainder = str;
  let searchString = null;

  for (const element of diff) {
    if (element === null) {
      lastWasNull = true;

      if (searchString) {
        const chopResult = chopOutSearchString(remainder, searchString);

        if (!chopResult) {
          return false;
        }

        remainder = chopResult.newRemainder;
      }
    } else {
      lastWasNull = false;
      searchString = element;
    }
  }

  if (lastWasNull) {
    return true;
  }

  const chopResult = chopOutSearchString(remainder, diff[diff.length - 1] as string);
  return chopResult !== null && chopResult.newRemainder.length === 0;
}
