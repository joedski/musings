/*
 * This version adds some optional run-time safety at the cost of some
 * performance and extra definition noise.
 *
 * The types have also been cleaned up to both fix some errors that
 * only surfaced in strict mode and make things a bit less indirect,
 * which hopefully speeds up TS's type processing a bit.
 * It's basically the same as [the r1 version](../classe-r1/TaggedSum.ts)
 * but with an extra valuesFactories prop.
 *
 * Lastly, `sum` and `type` were changed to `public` scope, and
 * `sum` along with `valuesFactories` was made `readonly`.
 */

/**
 * The TaggedSum is basically an Enum that can have associated values
 * for some or all enumerations.  Technically speaking, it's a disjoint
 * union whose members are distinguished by a tag, but that's basically
 * the same thing in this case.
 *
 * It can be used to implement things like Maybe<T>, Either<L, R>, etc.
 *
 * Since this is a class-based implementation, you can add your own operators
 * by adding class methods instead of specifying free functions or module functions.
 */
export default abstract class TaggedSum<
  TSumName extends string,
  TTagDefs extends [string, ...any[]]
> {
  /**
   * The name of this Tagged Sum.
   * Specify the value in the subclass using a getter.
   *
   * Example:
   *
   *     class Either<L, R> extends TaggedSum<'Either', ['Left', L] | ['Right', R]> {
   *       public get sum() { return 'Either' as 'Either'; }
   *
   *       constructor(...type: TaggedSumTagDefs<Either<L, R>>) {
   *         super(type);
   *       }
   *     }
   */
  public readonly sum!: TSumName;
  /**
   * Optional values factories, if you'd like run-time tag checking.
   * Define a getter to return this so that it's available to the TaggedSum constructor.
   * This is an object-map that maps each Tag Name to a Values Factory Function,
   * which is just a function that returns its args as a tuple (array).
   *
   * Example:
   *
   *     import TaggedSum, {
   *       ValuesFactories,
   *     } from './TaggedSum';
   *
   *     type AsyncDataTags<D, E> =
   *       | ['NotAsked']
   *       | ['Waiting']
   *       | ['Data', D]
   *       | ['Error', E]
   *       ;
   *
   *     // Defining the values factories outside of the class meanst
   *     // they're not created afresh every time you instantiate a TaggedSum.
   *     const asyncDataValuesFactories = {
   *       NotAsked: <D, E>(): [] => [],
   *       Waiting: <D, E>(): [] => [],
   *       Data: <D, E>(d: D): [D] => [d],
   *       Error: <D, E>(e: E): [E] => [e],
   *     };
   *
   *     class AsyncData<D, E> extends TaggedSum<'AsyncData', AsyncDataTags<D, E>> {
   *       // Use the utility type ValuesFactories<TTagDefs> to ensure proper type checking.
   *       // Can't use that type on the const above because we don't have the D and E type params,
   *       // if we want those, we need it here.
   *       public get valuesFactories() { return asyncDataValuesFactories as ValuesFactories<AsyncDataTags<D, E>>; }
   *
   *       // ...
   *     }
   */
  public readonly valuesFactories!: ValuesFactories<TTagDefs> | void;
  /**
   * Current tag and values for this instance.  Will be one of the tag defs
   * specified in the type arguments passed to `TaggedSum<TSumName, TTagDefs>`.
   */
  public type: TTagDefs;

  constructor(...type: TTagDefs) {
    if (!this.sum) throw new Error(`Cannot create tagged sum instance with no sum (Did you forget to define a "public get sum()"?)`);
    if (this.valuesFactories && !(type[0] in this.valuesFactories)) {
      throw new Error(`"${type[0]}" is not a valid tag of sum "${this.sum}"`);
    }
    const tagName: TTagDefs[0] = type[0];
    this.type = (
      this.valuesFactories
      ? [tagName, ...this.valuesFactories[tagName](...type.slice(1))] as TTagDefs
      : type
    );
  }

  /**
   * Defines a catamorphism for every Tag in this Sum, or in not so many
   * syllables, defines a value to map each Tag to.  Of course, you can
   * also use this to specify a side-effect for each Tag instead.
   *
   * Example:
   *
   *     const maybeNumber: Maybe<number> = Maybe.Just(4);
   *     // Map each Tag to a value...
   *     const definitelyNumber: maybeNumber.cata({
   *       Nothing: () => 0,
   *       Just: (n: number) => n,
   *     });
   *     // Or perform a side effect...
   *     maybeNumber.cata({
   *       Nothing: () => console.log('Nothing!'),
   *       Just: (n: number) => console.log(`It's Just ${n}!`),
   *     });
   * @param handlers Object-map of Handlers for each Tag of this Sum.
   */
  public cata<
    H extends CataHandlers<TTagDefs>
  >(
    handlers: H
  ): (H[TTagDefs[0]] extends (...args: any[]) => infer TReturn ? TReturn : never) {
    if (
      this.valuesFactories
      && ! Object.keys(this.valuesFactories).every(tagName => tagName in handlers)
    ) {
      const missingTags = Object.keys(this.valuesFactories).filter(tagName => !(tagName in handlers));
      throw new Error(`Missing tag handlers: ${missingTags.map(t => `"${t}"`).join(', ')}`);
    }
    if (!(this.tag in handlers)) {
      throw new Error(`"${this.tag}" not found in cata handlers`);
    }
    return handlers[this.tag](...this.values);
  }

  /**
   * Convenient way to get the instance's tag name.
   * Useful for one-off cases where you just want to
   * do some conditional behavior based on one tag.
   */
  public get tag() {
    return this.type[0] as TTagDefs[0];
  }

  /**
   * Convenient way to get just the instance's values.
   * It's mostly useful for debugging and inspecting,
   * not as useful type wise unless you like guarding
   * against all the different cases yourself.
   * It's better to use `AsyncData#cata()` to specify
   * a value for every tag name.
   */
  public get values() {
    return this.type.slice(1) as Tail<TTagDefs>;
  }
}

//// Utility Types

/**
 * Derives a ValuesFactories type from Tag Defs.
 * Use this when defining the valuesFactories getter in your subclass.
 */
export type ValuesFactories<TTagDefs extends [string, ...any[]]> = {
  [HK in TTagDefs[0]]: ValuesFactory<Extract<TTagDefs, [HK, ...any[]]>>;
};

/**
 * Single ValuesFactory in a ValuesFactories map.
 */
export type ValuesFactory<TTagDef> =
  TTagDef extends any[]
  ? ((...args: TTagDef) => any) extends ((k: infer TK, ...rest: infer TVs) => any)
  ? ((...values: TVs) => TVs)
  : never
  : never
  ;

/**
 * Generic shape of TaggedSum.
 */
export type AnyTaggedSum = TaggedSum<string, [string, ...any[]]>;

/**
 * Derives a CataHandlers type from Tag Defs.
 */
export type CataHandlers<TTagDefs extends [string, ...any[]]> = {
  [HK in TTagDefs[0]]: (...args: Tail<Extract<TTagDefs, [HK, ...any[]]>>) => any;
};

/**
 * Given a Tuple type, derive a new Tuple type which is
 * every element of the original except for the first one.
 * Uses functions because TS has better behavior around
 * rest-args in functions.
 */
export type Tail<T> =
  T extends any[]
  ? ((...args: T) => any) extends ((h: any, ...rest: infer TRest) => any)
  ? TRest
  : never
  : never
  ;

// These aren't really used here, but are useful elsewhere.

/**
 * Alias to extract the tag definitions from a TaggedSum child class type.
 */
export type TaggedSumTagDefs<TSum> =
  TSum extends TaggedSum<string, infer TTagDefs>
  ? TTagDefs
  : never
  ;

/**
 * Get all the Tag Names of a Tagged Sum.  If you have the tag definitions already handy
 * as `TTagDefs`, you can just do `TTagDefs[0]` to do the same thing.
 */
export type TaggedSumTagNames<TSum> = TaggedSumTagDefs<TSum>[0];

/**
 * Derives a TaggedSum type that is specialized to the named tag.
 */
export type TaggedSumSpecializedTo<TSum, TTagName> =
  TaggedSum<TaggedSumName<TSum>, Extract<TaggedSumTagDefs<TSum>, [TTagName, ...any[]]>>;

/**
 * Convenience type to get the SumName of a TaggedSum type.
 */
export type TaggedSumName<TSum> = TSum extends TaggedSum<infer TSumName, [string, ...any[]]> ? TSumName : never;
