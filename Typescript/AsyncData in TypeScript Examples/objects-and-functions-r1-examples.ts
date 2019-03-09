import * as maybe from './objects-and-functions-r1';

const value0Just = maybe.Just(true);
const value0Nothing = maybe.Nothing();

const value0JustAsAny: any = maybe.Just(true);

if (maybe.is(value0JustAsAny)) {
  // Expect: maybe.Maybe<unknown>
  const itIsAnyMaybe = value0JustAsAny;
}

if (maybe.Just.is(value0JustAsAny)) {
  const itIsJust = value0JustAsAny;
}

const result0Just = maybe.cata(value0Just, {
  Just: (value: boolean) => `Just ${value}!`,
  Nothing: () => 'Nothing!',
});

const result0JustNumber = maybe.map(value0Just, (a) => (a ? 42 : -42));

const resultOfFlattenedDoubleMaybe = maybe.flatMap(result0JustNumber, (a) => (a >= 0 ? maybe.Just(a) : maybe.Nothing<number>()));
