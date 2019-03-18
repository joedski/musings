import TaggedSum, {
  TaggedSumTagDefs,
  TaggedSumTagNames,
  TaggedSumSpecializedTo,
} from './TaggedSum';

/**
 * The Maybe type represents a value that maybe is there, or maybe isn't.
 * Whet it's there, it's Just that value, but when it's not there, it's Nothing.
 * Some people call it an Option instead, and it's functionally the same.
 */
export default class Maybe<A = unknown>
extends TaggedSum<'Maybe',
  | ['Nothing']
  | ['Just', A]
> {
  // Daggy style factories, if you're into that sort of thing.
  // These make it easier to create instances due to how TS infers types
  // with the tuple union setup.
  static Just = <A>(a: A) => new Maybe('Just', a);
  static Nothing = <A = unknown>() => new Maybe<A>('Nothing' as 'Nothing');

  // Predicates for imperative checks.

  /**
   * Check if a value is an instance of a TaggedSum without regard for any Tag.
   * Note that since the value may be anything, we cannot derive type parametrization
   * from it because that information was lost.  We can only determine the Sum and Tag.
   * @param inst The value that may or may not be an instance of a given tagged sum.
   */
  static is(inst: unknown): inst is Maybe<unknown> {
    return inst != null && inst instanceof Maybe;
  }

  /**
   * Checks if a value is an instance of a TaggedSum with a particular Tag.
   * Note that since the value may be anything, we cannot derive type parametrization
   * from it because that information was lost.  We can only determine the Sum and Tag.
   * @param tagName The tag name you want to check against.
   * @param inst The item that may or may not be an instance of a given tagged sum.
   */
  static isTag<
    TTagName extends TaggedSumTagNames<Maybe<any>>
  >(tagName: TTagName, inst: unknown): inst is TaggedSumSpecializedTo<Maybe, TTagName> {
    return Maybe.is(inst) && inst.type[0] === tagName;
  }

  sum: 'Maybe';

  constructor(...type: TaggedSumTagDefs<Maybe<A>>) {
    super(type);
  }

  map<B>(fn: (a: A) => B): Maybe<B> {
    return this.cata({
      Nothing: () => this as unknown as Maybe<B>,
      Just: (a: A) => new Maybe('Just', fn(a)),
    });
  }

  flatten<T>(this: Maybe<Maybe<T>>): Maybe<T> {
    return this.cata({
      Nothing: () => this as unknown as Maybe<T>,
      Just: (inner: Maybe<T>) => inner,
    });
  }

  flatMap<B>(fn: (a: A) => Maybe<B>): Maybe<B> {
    return this.map(fn).flatten();
  }
}
