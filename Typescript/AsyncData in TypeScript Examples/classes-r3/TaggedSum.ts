/*
 * This one looks a bit weird to define unless you're used to Data types
 * in Haskel or Elm.  However, in normal use, it's fairly fluent,
 * unlike all my attempts with either using specific Tagged Sum Type
 * as the base class or otherwise using Daggy-style object-definitions.
 *
 * This is a slight tweak over r1 to allow not needing to define a new
 * constructor in every subclass.
 */

/**
 * The TaggedSum is basically an Enum that can have associated values
 * for some or all enumerations.  Technically speaking, it's a disjoint
 * union whose members are distinguished by a tag, but that's basically
 * the same thing in this case.
 *
 * It can be used to implement things like Maybe<T>, Either<L, R>, etc.
 *
 * Example of subclassing:
 *
 *     import TaggedSum from './TaggedSum';
 *
 *     class Either<L, R>
 *     extends TaggedSum<'Either',
 *       | ['Left', L]
 *       | ['Right', R]
 *     > {
 *       // Factories that are easier to work with.
 *       static Left = <L, R>(left: L) => new Either<L, R>('Left', left);
 *       static Right = <L, R>(right: R) => new Either<L, R>('Right', right);
 *
 *       sum: 'Either';
 *
 *       // No need to override constructor,
 *       // just add any extra methods you might need.
 *     }
 *
 * Example of use:
 *
 *     const either0: Either<number, Error> = Either.Left(42);
 *     const either1: Either<number, Error> = Either.Right(new Error('oh no'));
 *
 *     const value0 = either0.cata({
 *       Left: (n: number) => n,
 *       Right: (e: Error) => NaN,
 *     });
 *
 *     const value1 = either1.cata({
 *       Left: (n: number) => n,
 *       Right: (e: Error) => NaN,
 *     });
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
   *     }
   */
  sum: TSumName;

  /**
   * Current tag and values of this instance.
   * No real reason to touch this directly except while debugging.
   * Rather, you should use #cata to define a mapping for
   * every tag/value-set to another value.
   */
  type: TTagDefs;

  /**
   * Instantiate a new TaggedSum value.  You shouldn't need to ever override this.
   * @param type Arguments should be the Tag Name followed by any of the parameters for that tag.
   */
  constructor(...type: TTagDefs) {
    this.type = type;
  }

  // I wanted to use <H extends TaggedSumCataHandlers<this>>> and TaggedSumCataHandlersReturnType<this, H>
  // but I was getting the following error:
  //   Error: Return type annotation circularly references itself
  // So I just used the type "this" ought to have... Seems to work.
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
  ): TaggedSumCataHandlersReturnType<TaggedSum<TSumName, TTagDefs>, H> {
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
  [HK in TaggedSumTagNames<TSum>]: (...args: TaggedSumCataHandlerArgs<TSum, HK>) => any;
};

/**
 * The return type for any of the handlers.
 */
export type TaggedSumCataHandlersReturnType<TSum extends AnyTaggedSum, THandlers extends TaggedSumCataHandlers<TSum>> =
  // Can't use ReturnType<T> in strict mode because TaggedSumCataHandlerArgs<TSum, TKey> is not assignable to any[].
  THandlers[TaggedSumTagNames<TSum>] extends (tagName: string, ...values: any[]) => infer TReturn ? TReturn : never;


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
