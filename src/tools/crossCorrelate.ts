interface Offset {
  score: number;
  offset: number;
}

type DiffFunction = (left: string, right: string) => number;

function integerValueOf(str: string): number {
  const buf = Buffer.from(str);
  let value = 0;

  for (let i = 0; i < buf.byteLength; i++) {
    // tslint:disable-next-line:no-bitwise
    value = value << i;
    value += buf.readUInt8(i);
  }

  return value;
}

export function crossCorrelateMeanSquared(
  left: ReadonlyArray<string>,
  right: ReadonlyArray<string>
): Offset | null {
  return crossCorrelate(left, right, meanSquaredDiff);
}

export function crossCorrelateStrings(
  left: ReadonlyArray<string>,
  right: ReadonlyArray<string>
): Offset | null {
  return crossCorrelate(left, right, stringDiff);
}

export function correlateStringMeanSquared(
  left: ReadonlyArray<string>,
  right: ReadonlyArray<string>
): number {
  return correlate1d(left, right, meanSquaredDiff);
}

export function correlateStringDiff(
  left: ReadonlyArray<string>,
  right: ReadonlyArray<string>
): number {
  return correlate1d(left, right, stringDiff);
}

const stringDiff: DiffFunction = (left, right) => (left === right ? 0 : 1);
const meanSquaredDiff: DiffFunction = (left, right) => {
  const diff = integerValueOf(left) - integerValueOf(right);
  return diff * diff;
};

function crossCorrelate(
  left: ReadonlyArray<string>,
  right: ReadonlyArray<string>,
  diff: DiffFunction
): Offset | null {
  if (left.length === 0 || right.length === 0) {
    return null;
  }

  let leastMeanOffset: Offset | null = null;

  const minOffset = 1 - right.length;
  const maxOffset = left.length - 1;
  for (let offset = minOffset; offset <= maxOffset; offset++) {
    const leftStartIndex = Math.max(0, offset);
    const rightStartIndex = Math.max(0, -offset);
    const offsetRangeLength = Math.max(
      1,
      Math.min(left.length - leftStartIndex, right.length - rightStartIndex)
    );
    const mean = correlate1d(
      left.slice(leftStartIndex, leftStartIndex + offsetRangeLength),
      right.slice(rightStartIndex, rightStartIndex + offsetRangeLength),
      diff
    );

    if (leastMeanOffset) {
      if (
        mean < leastMeanOffset.score ||
        (mean === leastMeanOffset.score && Math.abs(offset) < leastMeanOffset.offset)
      ) {
        leastMeanOffset.score = mean;
        leastMeanOffset.offset = offset;
      }
    } else {
      leastMeanOffset = {
        offset,
        score: mean
      };
    }
  }

  return leastMeanOffset;
}

function correlate1d(
  left: ReadonlyArray<string>,
  right: ReadonlyArray<string>,
  diff: DiffFunction
): number {
  if (left.length !== right.length) {
    throw new RangeError(
      `Left & right strings are not of equal length! ${left.length} & ${right.length}, respectively.`
    );
  }

  let sum = 0;
  for (let i = 0; i < left.length; i++) {
    sum += diff(left[i], right[i]);
  }

  return sum / left.length;
}
