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
  /**
   * The name of this Tagged Sum.
   * Specify the value in the subclass.
   *
   * Example:
   *
   *     class Either<L, R> extends TaggedSum<'Either', ['Left', L] | ['Right', R]> {
   *       sum: 'Either';
   *       constructor(...type: TaggedSumTagDefs<Either<L, R>>) {
   *         super(type);
   *       }
   *     }
   */
  protected sum!: TSumName;
  protected type: TTagDefs;

  constructor(type: TTagDefs) {
    this.type = type;
  }

  // I wanted to use <H extends TaggedSumCataHandlers<this>>> and TaggedSumCataHandlersReturnType<this, H>
  // but I was getting the following error:
  //   Error: Return type annotation circularly references itself
  // So I just used the type "this" ought to have... Seems to work.
  // Or not even that works.  Just put in a bare conditional type.
  /**
   * Defines a catamorphism for every Tag in this Sum, or in not so many
   * syllables, defines how to handle each Tag case, usually by defining
   * a value that each Tag maps to.
   *
   * Example:
   *
   *     const maybeNumber: Maybe<number> = Maybe.Just(4);
   *     const definitelyNumber: maybeNumber.cata({
   *       Nothing: () => 0,
   *       Just: (n: number) => n,
   *     });
   * @param handlers Object-map of Handlers for each Tag of this Sum.
   */
  public cata<
    H extends TaggedSumCataHandlers<TaggedSum<TSumName, TTagDefs>>
  >(
    handlers: H
  ): (H[TTagDefs[0]] extends (...args: any[]) => infer TReturn ? TReturn : never) {
    return handlers[this.type[0]](...this.type.slice(1));
  }

  /**
   * The tag name of this instance.  Mostly useful for debugging.
   */
  get tag() {
    return this.type[0] as TTagDefs[0];
  }

  /**
   * The values of this instance.  Mostly useful for debugging.
   * You should use `instance.cata({...})` to define a mapping
   * for each possible tag rather than using this getter.
   */
  get values() {
    return this.type.slice(1) as Tail<TTagDefs>;
  }
}

//// Utility Types

/**
 * Simple alias representing the most generic shape of TaggedSum.
 */
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
  [HK in TaggedSumTagNames<TSum>]: (this: TaggedSumSpecializedTo<TSum, HK>, ...args: TaggedSumCataHandlerArgs<TSum, HK>) => any;
};

/**
 * Get all the Tag Names of a Tagged Sum.
 */
export type TaggedSumTagNames<TSum> = TaggedSumTagDefs<TSum>[0];

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
