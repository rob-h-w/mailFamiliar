import Diff from './diff';
import stringDiff, {DEFAULT_MIN_LENGTH} from './stringDiff';

export default function addStringToDiff(
  diff: Diff,
  str: string,
  minLength: number = DEFAULT_MIN_LENGTH
): Diff {
  if (str.length === 0) {
    return diff;
  }

  const result: (string | null)[] = [];
  let lastWasNull = false;
  let remainder = str;

  for (const element of diff) {
    if (element === null) {
      if (!lastWasNull) {
        result.push(element);
        lastWasNull = true;
      }
      continue;
    }

    const index = remainder.indexOf(element);
    if (index !== -1) {
      // We've found a whole match for this element.
      remainder = remainder.substring(index + element.length);
      result.push(element);
      lastWasNull = false;
      continue;
    }

    const elementDiff = new Array(...stringDiff(element, remainder, minLength));
    if (elementDiff.length === 0) {
      if (!lastWasNull) {
        result.push(null);
        lastWasNull = true;
      }

      continue;
    }

    if (elementDiff[0] === null && lastWasNull) {
      elementDiff.pop();
    }

    let lastElementDiffIndex = elementDiff.length - 1;

    if (elementDiff[lastElementDiffIndex] === null) {
      lastWasNull = true;
      lastElementDiffIndex -= 1;
    } else {
      lastWasNull = false;
    }

    if (lastElementDiffIndex < 0) {
      continue;
    }

    if (elementDiff[lastElementDiffIndex] === null) {
      throw new Error(`Element ${lastElementDiffIndex} of ${elementDiff} should not be null.`);
    }

    const lastElementDiff = (elementDiff[lastElementDiffIndex] as unknown) as string;
    remainder = remainder.substring(remainder.indexOf(lastElementDiff) + lastElementDiff.length);

    result.push(...elementDiff);
  }

  if (result.length === 1 && result[0] === null) {
    return [];
  }

  return result;
}
