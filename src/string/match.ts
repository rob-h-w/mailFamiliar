import Diff from './diff';
interface MatchResult {
  isComplete: boolean;
  wildcardMatches: ReadonlyArray<string>;
}

function chopOutSearchString(
  remainder: string,
  searchString: string
): {newRemainder: string; trailingWildCard: string} | null {
  const index = remainder.indexOf(searchString);

  if (index === -1) {
    return null;
  }

  return {
    newRemainder: remainder.slice(index + searchString.length),
    trailingWildCard: remainder.substring(0, index)
  };
}

export default function match(diff: Diff, str: string): MatchResult {
  if (diff.length === 0) {
    return {
      isComplete: false,
      wildcardMatches: []
    };
  }

  let isComplete = true;
  let lastWasNull = false;
  let nullCount = 0;
  let remainder = str;
  let searchString = null;

  const wildcardMatches = [];

  for (const element of diff) {
    if (element === null) {
      lastWasNull = true;
      nullCount++;

      if (searchString) {
        const chopResult = chopOutSearchString(remainder, searchString);

        if (!chopResult) {
          isComplete = false;
          break;
        }

        // Only add the wildcard if it's trailing.
        if (nullCount > 1) {
          wildcardMatches.push(chopResult.trailingWildCard);
        }

        remainder = chopResult.newRemainder;
      }
    } else {
      lastWasNull = false;
      searchString = element;
    }
  }

  if (isComplete) {
    if (lastWasNull) {
      wildcardMatches.push(remainder);
    } else {
      const chopResult = chopOutSearchString(remainder, diff[diff.length - 1] as string);
      if (chopResult) {
        if (chopResult.newRemainder.length !== 0) {
          isComplete = false;
        }

        wildcardMatches.push(chopResult.trailingWildCard);
      } else {
        isComplete = false;
      }
    }
  } else {
    wildcardMatches.push(remainder);
  }

  return {
    isComplete,
    wildcardMatches
  };
}
