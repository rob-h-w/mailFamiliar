import {diff_match_patch} from 'diff-match-patch';

const dmp = new diff_match_patch();

export const DEFAULT_MIN_LENGTH = 2;

export default function stringDiff(
  first: string,
  second: string,
  minLength: number = DEFAULT_MIN_LENGTH
): ReadonlyArray<string | null> {
  if (minLength < 2) {
    throw new Error(`Minlength must be greater than 1, but was ${minLength}`);
  }

  const dmpDiffs = dmp.diff_main(first, second, false);
  const match: Array<string | null> = [];
  let lastWasNull = false;

  for (const dmpDiff of dmpDiffs) {
    const [type, value] = dmpDiff;
    if (type === 0 && value.length >= minLength) {
      lastWasNull = false;
      match.push(value);
    } else {
      if (!lastWasNull) {
        match.push(null);
        lastWasNull = true;
      }
    }
  }

  if (match.length === 1 && match[0] === null) {
    return [];
  }

  return match;
}
