export type Maybe<T> = { '@sum': 'Maybe' } & (
  | { '@tag': 'Just', '@values': [T] }
  | { '@tag': 'Nothing', '@values': [] }
);

export const is = isAnySumMember<Maybe<unknown>>('Maybe');

export function Just<T>(value: T): Maybe<T> {
  return { '@sum': 'Maybe', '@tag': 'Just', '@values': [value] };
}

Just.is = isSpecificSumMember<Maybe<unknown>, 'Just'>('Maybe', 'Just');

export function Nothing<T = unknown>(): Maybe<T> {
  return { '@sum': 'Maybe', '@tag': 'Nothing', '@values': [] };
}

Nothing.is = isSpecificSumMember<Maybe<unknown>, 'Nothing'>('Maybe', 'Nothing');

//// Generic functions

export function cata<
  TSum extends AnyTaggedSumInstance,
  TCatas extends AnyCatasFor<TSum>,
>(
  inst: TSum,
  catas: TCatas
): AnyCataHandlerReturnType<TSum, TCatas> {
  return catas[inst['@tag']](...inst['@values']);
}

//// Specific Functions

export function map<A, B>(inst: Maybe<A>, fn: (a: A) => B): Maybe<B> {
  return cata(inst, {
    Just: (a: A) => Just(fn(a)),
    Nothing: () => inst as Maybe<B>,
  });
}

export function flatten<A>(inst: Maybe<Maybe<A>>): Maybe<A> {
  return cata(inst, {
    Just: (a: Maybe<A>) => a,
    Nothing: () => inst as Maybe<A>,
  })
}

export function flatMap<A, B>(inst: Maybe<A>, fn: (a: A) => Maybe<B>): Maybe<B> {
  return flatten(map(inst, fn));
}

//// Utilities

function isAnySumMember<TExpectedSum extends AnyTaggedSumInstance>(sumName: TExpectedSum['@sum']): (inst: any) => inst is TExpectedSum {
  return function $isAnySumMember(inst): inst is TExpectedSum {
    return (
      inst
      && typeof inst === 'object'
      && '@sum' in inst
      && inst['@sum'] === sumName
      && '@tag' in inst
      && '@values' in inst
    );
  }
}

function isSpecificSumMember<
  TExpectedSum extends AnyTaggedSumInstance,
  TExpectedTagName extends string,
>(
  sumName: TExpectedSum['@sum'],
  tagName: TExpectedTagName
): (inst: any) => inst is Extract<TExpectedSum, { '@tag': TExpectedTagName }> {
  const $isAnySumMember = isAnySumMember(sumName);
  return function $isSpecicSumMember(inst): inst is Extract<TExpectedSum, { '@tag': TExpectedTagName }> {
    return (
      $isAnySumMember(inst)
      && inst['@tag'] === tagName
    );
  }
}


//////// Utility Types

interface AnyTaggedSumInstance {
  '@sum': string;
  '@tag': string;
  '@values': any[];
}

interface AnyTaggedSumInstanceOfSum<TSumName extends string> extends AnyTaggedSumInstance {
  '@sum': TSumName;
}

interface AnyTaggedSumInstanceOfTag<TSumName extends string, TTagName extends string> extends AnyTaggedSumInstanceOfSum<TSumName> {
  '@tag': TTagName;
}

type TagKeysOf<T> = T extends { '@tag': infer TTagKey } ? TTagKey extends string ? TTagKey : never : never;

type AnyCataHandlerReturnType<TSum, TCatas> =
  TCatas extends { [K in TagKeysOf<TSum>]: (...args: any[]) => any }
  ? ReturnType<TCatas[TagKeysOf<TSum>]>
  : never
  ;

type AnyCatasFor<
  TSum
> = {
  [K in TagKeysOf<TSum>]: (...args: ValuesTypeByTag<TSum>[K]) => any;
};

type ValuesTypeByTag<TSum> = {
  [K in TagKeysOf<TSum>]: TSum extends { '@tag': K; '@values': infer TValues } ? TValues extends any[] ? TValues : never : never;
};



//////// Inline Examples

const value0Just = Just(true);
const value0Nothing = Nothing();

//// Utilities

const value0JustAsAny: any = Just(false);

if (is(value0JustAsAny)) {
  // Not sure how much more exact we can get than that.
  // There's no real way to tell the type without looking at the actual data.
  // `any` just swallows all that up.
  const value0JustAsMaybeOfAny: Maybe<any> = value0JustAsAny;
  // gives string, but `value` will technically have the type `any`.
  const result = cata(value0JustAsAny, {
    Nothing: () => 'Nothing!',
    Just: (value) => `Just ${value}!`,
  });
}

const isValue0JustMaybe = is(value0Just);
const isValue0NothingMaybe = is(value0Nothing);

// Expect: 'Nothing' | 'Just'
type TagKeysOfMaybe = TagKeysOf<Maybe<any>>;
type ValuesTypeByTagOfMaybeBoolean = ValuesTypeByTag<Maybe<boolean>>;
type ValuesTypeFromTagKeys = ValuesTypeByTag<Maybe<boolean>>[TagKeysOf<Maybe<boolean>>];

//// Return Types of Cases

const catasOfMaybeBoolean = {
  Nothing: () => 'Nothing!',
  Just: (value: boolean) => `Just ${value}!`,
};

const mixedCatasOfMaybeBoolean = {
  Nothing: () => null as void, // nulls have to be cast as void.
  Just: (value: boolean) => `Just ${value}!`,
};

// Expect: string
type catasOfMaybeBooleanReturnType = AnyCataHandlerReturnType<Maybe<boolean>, typeof catasOfMaybeBoolean>;
// Expect: string | null
type mixedCatasOfMaybeBooleanReturnType = AnyCataHandlerReturnType<Maybe<boolean>, typeof mixedCatasOfMaybeBoolean>;

//// Return Type of Cata itself

// Expect: string
const result0Just = cata(value0Just, catasOfMaybeBoolean);
// Expect: string
const result0Nothing = cata(value0Nothing, catasOfMaybeBoolean);

//// Inline Catas

const result0Just1 = cata(value0Just, {
  Nothing: () => 'Nothing!',
  // NOTE: Not sure if I can do anything to easily make TS infer the param type.
  // Oh well.
  Just: (value: boolean) => `Just ${value}!`,
});

//// Catas must have all cases

// Expect: Error: Property 'Nothing' is missing in...
const result0JustFailMissingCase = cata(value0Just, {
  Just: (value: boolean) => `Just ${value}!`,
})

// Expect: No error; cata only checks the tags of Maybe<boolean>
const result0JustFailExcessCase = cata(value0Just, {
  Nothing: () => 'Nothing!',
  Just: (value: boolean) => `Just ${value}!`,
  OrIsIt: () => 2,
});


