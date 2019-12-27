import Diff from '../string/diff';

export default function regexFromStringDiff(stringDiff: Diff): RegExp {
  return RegExp(
    stringDiff.reduce(
      (previous: string, current: string | null) =>
        `${previous}${
          current === null ? '(.+)' : current.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
        }`,
      ''
    ),
    'ms'
  );
}
