/**
 * This one looks a bit weird to define unless you're used to Data types
 * in Haskel or Elm.  However, in normal use, it's fairly fluent,
 * unlike all my attempts with either using specific Tagged Sum Type
 * as the base class or otherwise using Daggy-style object-definitions.
 */

abstract class TaggedSum<
  TSum extends string,
  TSpec extends [string, ...any[]]
> {
  sum: TSum;
  type: TSpec;

  constructor(sum: TSum, type: TSpec) {
    this.sum = sum;
    this.type = type;
  }

  public cata<T extends AnyTaggedSum, H extends TaggedSumCataHandlers<T>>(this: T, handlers: H): ReturnType<H[TaggedSumTypeNames<T>]> {
    return handlers[this.type[0]](...this.type.slice(1));
  }

  get tag() {
    return this.type[0] as TSpec[0];
  }

  get values() {
    return this.type.slice(1) as Tail<TSpec>;
  }
}

// type TaggedSumValuesType<T> =
//   T extends [string, ...any[]] ? : never;

type AnyTaggedSum = TaggedSum<string, [string, ...any[]]>;

type _CheckNoArgs = ['Foo'] extends [string] ? true : false;
type _CheckWithArgs = ['Bar', string] extends [string] ? true : false;
type _CheckWithArgs2 = ['Bar', string] extends [string, ...any[]] ? true : false;
type _CheckUnion = (['Foo'] | ['Bar', string]) extends [string, ...any[]] ? true : false;

type TaggedSumTypes<TSum> =
  TSum extends TaggedSum<string, infer TSpec>
  ? TSpec
  : never
  ;

// TaggedSumCataHandlers for the cata method
type TaggedSumCataHandlers<TSum> = {
  [HK in TaggedSumTypeNames<TSum>]: (...args: TaggedSumCataHandlerArgs<TSum, HK>) => any;
};

// type OnlyAllowedHandlers<TSum, THandlers extends TaggedSumCataHandlers<TSum>> = {
//   // This first one didn't enforce the required keys.
//   // [HK in Extract<keyof THandlers, string>]: HK extends TaggedSumTypeNames<TSum> ? THandlers[HK] extends (...args: TaggedSumCataHandlerArgs<TSum, HK>) => any ? THandlers[HK] : never : never;
//   [HK in TaggedSumTypeNames<TSum>]:
//     //HK extends keyof THandlers
//     THandlers[HK] extends (...args: TaggedSumCataHandlerArgs<TSum, HK>) => any
//     ? THandlers[HK]
//     // : never
//     : never
//     ;
// };

type _MaybeHandlers<A> = TaggedSumCataHandlers<Maybe<A>>;
type _MaybeTypes<A> = Maybe<A> extends TaggedSum<any, infer TTypes> ? TTypes : never;
type _MaybeTypeNames = _MaybeTypes<any> extends [infer TNames, ...any[]] ? TNames : never;
type _MaybeTypeNamesTest = TaggedSumTypeNames<Maybe<any>>;
type _MaybeTypeAnyFns = (...args: Tail<_MaybeTypes<any>>) => any;
type _MaybeTypeFnOfJust = (...args: Tail<Extract<_MaybeTypes<boolean>, ['Just', ...any[]]>>) => any;
type _MaybeTypeFnOfNothing = (...args: Tail<Extract<_MaybeTypes<boolean>, ['Nothing', ...any[]]>>) => any;

type TaggedSumTypeNames<TSum> =
  TSum extends TaggedSum<string, infer TTypes>
  ? TTypes extends [infer TNames, ...any[]]
  ? TNames
  : never
  : never
  ;

type TaggedSumCataHandlerArgs<TSum, THandlerKey> =
  TSum extends TaggedSum<string, infer TTypes>
  ? Tail<Extract<TTypes, [THandlerKey, ...any[]]>>
  : never
  ;

// Can't currently do (T extends [any, ...infer TTail])
// Modified off of this:
//   https://github.com/Microsoft/TypeScript/issues/25719#issuecomment-433658100
type Tail<T> =
  T extends any[]
  ? ((...args: T) => any) extends (h: any, ...rest: infer TRest) => any
  ? TRest
  : never
  : never
  ;

// Trials with a Maybe type.

class Maybe<A = unknown> extends TaggedSum<'Maybe', ['Nothing'] | ['Just', A]> {
  // Daggy style factories, if you're into that sort of thing.
  static Just<A>(a: A) {
    return new Maybe('Just', a);
  }

  static Nothing<A = unknown>() {
    return new Maybe<A>('Nothing' as 'Nothing');
  }

  static is(inst: unknown): inst is Maybe<unknown> {
    return (
      inst != null
      && inst instanceof Maybe
    );
  }

  // // This leads to a slightly messy result, but at least the tag type works.
  // // Usually, I use isType (or Type.is) more for acting only on one case
  // // instead of using a full cata, rather than for extracting the value.
  // // I try to always use cata for extracting values because it explicitly
  // // defines all the values.
  // static isType<TTypeName extends TaggedSumTypeNames<Maybe<any>>>(type: TTypeName, inst: unknown): inst is Maybe & { type: Extract<TaggedSumTypes<Maybe>, [TTypeName, ...any[]]> } {
  // If I just respecialize it, then it works well, so hey.
  static isType<
    TTypeName extends TaggedSumTypeNames<Maybe<any>>
  >(type: TTypeName, inst: unknown): inst is TaggedSumSpecializedTo<Maybe, TTypeName> {
  // It might seem like this should work at first, but I think because the type union
  // is bound up inside the class, not the other way around,
  // that the more general Maybe is not assignable to the more specific { type: [SpecificTag, ...any[]] }.
  // static isType<TTypeName extends TaggedSumTypeNames<Maybe<any>>>(type: TTypeName, inst: unknown): inst is Extract<Maybe, { type: [TTypeName, ...any[]] }> {
    return (
      Maybe.is(inst)
      && inst.type[0] === type
    );
  }

  // And now, back to our show.
  constructor(...type: TaggedSumTypes<Maybe<A>>) {
    super('Maybe', type);
  }

  map<A, B>(this: Maybe<A>, fn: (a: A) => B): Maybe<B> {
    return this.cata({
      Nothing: () => this as Maybe<B>,
      Just: (a: A) => new Maybe('Just', fn(a)),
    });
  }

  flatten<A>(this: Maybe<Maybe<A>>): Maybe<A> {
    return this.cata({
      Nothing: () => this as Maybe<A>,
      Just: (inner: Maybe<A>) => inner,
    });
  }

  flatMap<A, B>(this: Maybe<A>, fn: (a: A) => Maybe<B>): Maybe<B> {
    return this.map(fn).flatten();
  }
}

type _MaybeSpecialization<TTagName> =
  TTagName extends TaggedSumTypeNames<Maybe<number>>
  ? Maybe<number> extends TaggedSum<infer TSum, infer TTypes>
  ? TaggedSum<TSum, Extract<TTypes, [TTagName, ...any[]]>>
  : never : never;
type _MaybeSpecializedToJust = _MaybeSpecialization<'Just'>;

type TaggedSumSpecializedTo<TSum, TTagName> =
  TSum extends TaggedSum<infer TSumName, infer TTypes>
  ? TTagName extends TaggedSumTypeNames<TSum>
  ? TaggedSum<TSumName, Extract<TTypes, [TTagName, ...any[]]>>
  : never : never;

// should return T extends Maybe<string>
const maybe0: Maybe<string> = new Maybe('Nothing');
const maybe1: Maybe<string> = new Maybe('Just', 'this string');
const maybe0DaggyStyle: Maybe<string> = Maybe.Nothing();
const maybe1DaggyStyle: Maybe<string> = Maybe.Just('this string here');


// should elicit errors
const maybe2: Maybe<number> = new Maybe('Just', '5');
const maybeErrorTooManyArgs: Maybe<string> = new Maybe('Nothing', 'yes', 'no');
const maybeErrorTooFewArgs: Maybe<string> = new Maybe('Just');
const maybeErrorNoType: Maybe<string> = new Maybe();
const maybeErrorNotValidType: Maybe<string> = new Maybe('Not A Type');

// Maybe<string>.cata()
const mapbe0value0 = maybe0.cata({});
const maybe0value1 = maybe0.cata({
  Nothing: () => 0,
});
const maybe0value2 = maybe0.cata({
  Nothing: () => 0,
  Just: (a: string) => a.length,
});
// Haven't found a good way of restricting allowed props, but at least the return type is accurate.
const maybe0value3 = maybe0.cata({
  Nothing: () => 0,
  Just: (a: string) => a.length,
  Foo: () => true,
});

// Maybe.is
const maybe0AsAny: any = maybe0;
if (Maybe.is(maybe0AsAny)) {
  maybe0AsAny.cata({
    Nothing: () => console.log('Nothing!'),
    Just: (a: unknown) => console.log('Just this:', a),
  });
}

if (Maybe.isType('Just', maybe0AsAny)) {
  // isType doesn't preserve anything besides the case name,
  // so typeName here is 'Just', but that's all we get.
  const typeName = maybe0AsAny.type[0];
  // We get unknown here, due to the above.
  const typeValue1 = maybe0AsAny.type[1];
  // Error: No element at index 2.
  const typeValue2 = maybe0AsAny.type[2];
  // :: "Just"
  const typeName2 = maybe0AsAny.tag;
  // :: [unknown]
  const values = maybe0AsAny.values;
}