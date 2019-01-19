import stringDiff, {DEFAULT_MIN_LENGTH} from './stringDiff';

export default function addStringToDiff(
  diff: ReadonlyArray<string | null>,
  str: string,
  minLength: number = DEFAULT_MIN_LENGTH
): ReadonlyArray<string | null> {
  if (str.length === 0) {
    return diff;
  }

  const splattedDiff = diff.reduce<string>(
    (previous, current) => `${previous}${current === null ? '' : current}`,
    ''
  );
  const result = [...stringDiff(splattedDiff, str, minLength)];

  if (result.length) {
    if (result[0] !== null && diff[0] === null) {
      result.unshift(null);
    }

    if (result[result.length - 1] !== null && diff[diff.length - 1] === null) {
      result.push(null);
    }
  }

  return result;
}
