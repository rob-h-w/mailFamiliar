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

export function crossCorrelate1d(left: string[], right: string[]): number {
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
