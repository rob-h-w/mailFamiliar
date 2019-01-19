export default function regexFromStringDiff(stringDiff: ReadonlyArray<string | null>): RegExp {
  return RegExp(
    stringDiff.reduce(
      (previous: string, current: string | null) =>
        `${previous}${current === null ? '(.+)' : current}`,
      ''
    )
  );
}
