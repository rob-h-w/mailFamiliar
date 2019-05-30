export const DEFAULT_MIN_LENGTH = 2;

interface StringState {
  next: number;
}

interface MatchState {
  first: StringState;
  minLength: number;
  second: StringState;
  tentative?: string[];
}

interface StateResult {
  interimResult?: string | null;
  nextMatcher: Matcher | null;
  result?: string | null;
  state: MatchState;
}

type Matcher = (
  first: ReadonlyArray<string>,
  second: ReadonlyArray<string>,
  state: MatchState
) => StateResult;

const StateResult = {
  from: (state: MatchState): StateResult => ({
    nextMatcher: null,
    result: null,
    state: {
      first: {
        next: state.first.next
      },
      minLength: state.minLength,
      second: {
        next: state.second.next
      },
      tentative: state.tentative
    }
  })
};

const initial: Matcher = (
  first: ReadonlyArray<string>,
  second: ReadonlyArray<string>,
  state: MatchState
) => {
  const stateResult: StateResult = StateResult.from(state);
  stateResult.result = undefined;
  const fState: StringState = stateResult.state.first;
  const sState: StringState = stateResult.state.second;
  stateResult.nextMatcher = first[fState.next] === second[sState.next] ? potentialMatch : noMatch;
  return stateResult;
};

const noMatch: Matcher = (
  first: ReadonlyArray<string>,
  second: ReadonlyArray<string>,
  state: MatchState
) => {
  const stateResult: StateResult = StateResult.from(state);
  stateResult.result = state.tentative ? undefined : null;
  const fState: StringState = stateResult.state.first;
  const sState: StringState = stateResult.state.second;
  sState.next++;

  for (let i = fState.next; i < first.length; i++) {
    for (let j = sState.next; j < second.length; j++) {
      if (first[i] === second[j]) {
        fState.next = i;
        sState.next = j;
        stateResult.nextMatcher = potentialMatch;
        return stateResult;
      }
    }
  }

  stateResult.nextMatcher = null;
  return stateResult;
};

const potentialMatch: Matcher = (
  first: ReadonlyArray<string>,
  second: ReadonlyArray<string>,
  state: MatchState
) => {
  const strs: string[] = [first[state.first.next]];
  const stateResult: StateResult = StateResult.from(state);
  stateResult.result = undefined;
  stateResult.state.tentative = strs;
  const fState: StringState = stateResult.state.first;
  const sState: StringState = stateResult.state.second;
  fState.next++;
  sState.next++;

  for (let i = fState.next, j = sState.next; i < first.length && j < second.length; i++, j++) {
    if (first[i] !== second[j]) {
      fState.next = state.first.next;
      sState.next = state.second.next;
      stateResult.nextMatcher = noMatch;
      return stateResult;
    }

    strs.push(first[i]);

    if (strs.length === state.minLength) {
      stateResult.nextMatcher = match;
      fState.next = i;
      sState.next = j;
      return stateResult;
    }
  }

  stateResult.nextMatcher = null;
  return stateResult;
};

const match: Matcher = (
  first: ReadonlyArray<string>,
  second: ReadonlyArray<string>,
  state: MatchState
) => {
  const stateResult: StateResult = StateResult.from(state);
  stateResult.result = (stateResult.state.tentative || []).join('');
  stateResult.state.tentative = undefined;
  const fState: StringState = stateResult.state.first;
  const sState: StringState = stateResult.state.second;
  fState.next++;
  sState.next++;

  for (let i = fState.next, j = sState.next; i < first.length && j < second.length; i++, j++) {
    if (first[i] !== second[j]) {
      fState.next = i;
      sState.next = j;
      stateResult.nextMatcher = noMatch;
      return stateResult;
    }

    stateResult.result += first[i];
  }

  stateResult.nextMatcher = null;
  return stateResult;
};

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
  const match: Array<string | null> = [];

  if (f.length < minLength || s.length < minLength) {
    return match;
  }

  let matcher: Matcher | null = initial;
  let state: MatchState = {
    first: {next: 0},
    minLength,
    second: {next: 0}
  };

  while (matcher) {
    const matchResult: StateResult = matcher(f, s, state);
    state = matchResult.state;
    matcher = matchResult.nextMatcher;

    if (matchResult.result !== undefined) {
      match.push(matchResult.result);
    }
  }

  if (match.length === 1 && match[0] === null) {
    return [];
  }

  return match;
}
