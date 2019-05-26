export const DEFAULT_MIN_LENGTH = 2;

export default function stringDiff(
  first: string,
  second: string,
  minLength: number = DEFAULT_MIN_LENGTH
): ReadonlyArray<string | null> {
  if (minLength < 2) {
    throw new Error(`Minlength must be greater than 1, but was ${minLength}`);
  }

  if (first && first === second) {
    return [first];
  }

  const [f, s] = [[...first], [...second]];
  const result: Array<string | null> = [];

  if (f.length < minLength || s.length < minLength) {
    return result;
  }

  const firstEndIndex = f.length - minLength + 1;

  let jNext = 0;
  let matchLength = 0;
  let start = 0;
  let finish = 0;

  // tslint:disable-next-line prefer-for-of
  for (let i = 0; i < firstEndIndex; i++) {
    let iNext = i;
    for (let j = jNext; j < s.length; j++) {
      const firstNext = f[iNext];
      const foundFirst = !!matchLength;
      const secondNext = s[j];
      const secondNextIsFirst = j === 0;
      const secondNextIsLast = j === s.length - 1;
      const thisMatches = firstNext === secondNext;

      if (thisMatches) {
        matchLength++;
      }

      const inAMatch = matchLength >= minLength;

      if (thisMatches && inAMatch && !secondNextIsLast) {
        iNext++;
        jNext = j;
        continue;
      }

      const prependNull = !inAMatch && !thisMatches && !secondNextIsFirst && result.length === 0;

      if (prependNull) {
        result.push(null);
      }

      if (thisMatches && !foundFirst) {
        // We've found the beginning.
        start = i;
      }

      if (!thisMatches || secondNextIsLast) {
        matchLength = 0;

        if (inAMatch) {
          // We've found the end.
          if (secondNextIsLast && thisMatches) {
            // i was not incremented
            finish = iNext + 1;
          } else {
            finish = iNext;
          }

          // undo the increment to i with -1;
          i = finish - 1;
          const match = f.slice(start, finish).join('');
          result.push(match);
          jNext = j;

          const appendNull = !thisMatches;

          if (appendNull) {
            result.push(null);
          }

          break;
        } else {
          // Reset the first string index & start checking again.
          iNext = i;
        }
      } else {
        iNext++;
      }
    }
  }

  if (result.length === 1 && result[0] === null) {
    return [];
  }

  return result;
}
