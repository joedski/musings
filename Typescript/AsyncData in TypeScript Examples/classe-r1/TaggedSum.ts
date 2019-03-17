/*
 * This one looks a bit weird to define unless you're used to Data types
 * in Haskel or Elm.  However, in normal use, it's fairly fluent,
 * unlike all my attempts with either using specific Tagged Sum Type
 * as the base class or otherwise using Daggy-style object-definitions.
 */

/**
 * The TaggedSum is basically an Enum that can have associated values
 * for some or all enumerations.  Technically speaking, it's a disjoint
 * union whose members are distinguished by a tag, but that's basically
 * the same thing in this case.
 *
 * It can be used to implement things like Maybe<T>, Either<L, R>, etc.
 */
export default abstract class TaggedSum<
  TSumName extends string,
  TTagDefs extends [string, ...any[]]
> {
  sum: TSumName;
  type: TTagDefs;

  constructor(sum: TSumName, type: TTagDefs) {
    this.sum = sum;
    this.type = type;
  }

  // I wanted to use <H extends TaggedSumCataHandlers<this>>> and TaggedSumCataHandlersReturnType<this, H>
  // but I was getting the following error:
  //   Error: Return type annotation circularly references itself
  // So I just used the type "this" ought to have... Seems to work.
  public cata<H extends TaggedSumCataHandlers<TaggedSum<TSumName, TTagDefs>>>(handlers: H): TaggedSumCataHandlersReturnType<TaggedSum<TSumName, TTagDefs>, H> {
    return handlers[this.type[0]](...this.type.slice(1));
  }

  get tag() {
    return this.type[0] as TTagDefs[0];
  }

  get values() {
    return this.type.slice(1) as Tail<TTagDefs>;
  }
}

//// Utility Types

// Simple alias for representing the most generic shape of TaggedSum.
export type AnyTaggedSum = TaggedSum<string, [string, ...any[]]>;

/**
 * Alias to extract the tag definitions
 */
export type TaggedSumTagDefs<TSum> =
  TSum extends TaggedSum<string, infer TTagDefs>
  ? TTagDefs
  : never
  ;

/**
 * A Cata Handlers Object type for a given Tagged Sum.
 */
export type TaggedSumCataHandlers<TSum> = {
  [HK in TaggedSumTagNames<TSum>]: (...args: TaggedSumCataHandlerArgs<TSum, HK>) => any;
};

export type TaggedSumCataHandlersReturnType<TSum extends AnyTaggedSum, THandlers extends TaggedSumCataHandlers<TSum>> =
  ReturnType<THandlers[TaggedSumTagNames<TSum>]>;

/**
 * Get all the Tag Names of a Tagged Sum.
 */
export type TaggedSumTagNames<TSum> = TaggedSumTagDefs<TSum>[0];
  // TSum extends TaggedSum<string, infer TTagDefs>
  // ? TTagDefs extends [infer TNames, ...any[]]
  // ? TNames
  // : never
  // : never
  ;

/**
 * Args for a given Tag's Cata Handler.
 */
export type TaggedSumCataHandlerArgs<TSum, THandlerKey> =
  TSum extends TaggedSum<string, infer TTagDefs>
  ? Tail<Extract<TTagDefs, [THandlerKey, ...any[]]>>
  : never
  ;

// Can't currently do (T extends [any, ...infer TTail])
// Modified off of this:
//   https://github.com/Microsoft/TypeScript/issues/25719#issuecomment-433658100
/**
 * Given a tuple type, get a derived tuple type that's everything but the first element.
 * Due to how TS treats function args, Tail<[]> will still return []
 * rather than anything else.
 */
export type Tail<T> =
  T extends any[]
  ? ((...args: T) => any) extends (h: any, ...rest: infer TRest) => any
  ? TRest
  : never
  : never
  ;

/**
 * Derives a TaggedSum type that is specialized to the named tag.
 */
export type TaggedSumSpecializedTo<TSum, TTagName> =
  TSum extends TaggedSum<infer TSumName, infer TTagDefs>
  ? TTagName extends TaggedSumTagNames<TSum>
  ? TaggedSum<TSumName, Extract<TTagDefs, [TTagName, ...any[]]>>
  : never : never;
