interface Offset {
  meanSquared: number;
  offset: number;
}

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

export function crossCorrelate1d(
  left: ReadonlyArray<string>,
  right: ReadonlyArray<string>
): number {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  let leastMeanSquaredOffset: Offset | null = null;

  const minOffset = 1 - right.length;
  const maxOffset = left.length - 1;
  for (let offset = minOffset; offset <= maxOffset; offset++) {
    const leftStartIndex = Math.max(0, offset);
    const rightStartIndex = Math.max(0, -offset);
    const offsetRangeLength = Math.max(
      1,
      Math.min(left.length - leftStartIndex, right.length - rightStartIndex)
    );
    let sumSquared = 0;
    for (let i = 0; i < offsetRangeLength; i++) {
      const leftIndex = leftStartIndex + i;
      const rightIndex = rightStartIndex + i;
      const diff = integerValueOf(left[leftIndex]) - integerValueOf(right[rightIndex]);
      sumSquared += diff * diff;
    }

    const meanSquared = sumSquared / offsetRangeLength;

    if (leastMeanSquaredOffset) {
      if (meanSquared < leastMeanSquaredOffset.meanSquared) {
        leastMeanSquaredOffset.meanSquared = meanSquared;
        leastMeanSquaredOffset.offset = offset;
      }

      if (leastMeanSquaredOffset.meanSquared === 0) {
        return leastMeanSquaredOffset.offset;
      }
    } else {
      leastMeanSquaredOffset = {
        meanSquared,
        offset
      };
    }
  }

  return leastMeanSquaredOffset ? leastMeanSquaredOffset.offset : 0;
}

export function crossCorrelateStrings(
  left: ReadonlyArray<string>,
  right: ReadonlyArray<string>
): number {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  let leastMeanOffset: Offset | null = null;

  const minOffset = 1 - right.length;
  const maxOffset = left.length - 1;
  const shortest = left.length > right.length ? right : left;
  for (let offset = minOffset; offset <= maxOffset; offset++) {
    const leftStartIndex = Math.max(0, offset);
    const rightStartIndex = Math.max(0, -offset);
    const offsetRangeLength = Math.max(
      1,
      Math.min(left.length - leftStartIndex, right.length - rightStartIndex)
    );
    let sum = shortest.length - offsetRangeLength;
    const total = offsetRangeLength + sum;
    for (let i = 0; i < offsetRangeLength; i++) {
      const leftIndex = leftStartIndex + i;
      const rightIndex = rightStartIndex + i;
      const diff = left[leftIndex] === right[rightIndex] ? 0 : 1;
      sum += diff;
    }

    const mean = sum / total;

    if (leastMeanOffset) {
      if (
        mean < leastMeanOffset.meanSquared ||
        (mean === leastMeanOffset.meanSquared && Math.abs(offset) < leastMeanOffset.offset)
      ) {
        leastMeanOffset.meanSquared = mean;
        leastMeanOffset.offset = offset;
      }
    } else {
      leastMeanOffset = {
        meanSquared: mean,
        offset
      };
    }
  }

  return leastMeanOffset ? leastMeanOffset.offset : 0;
}
