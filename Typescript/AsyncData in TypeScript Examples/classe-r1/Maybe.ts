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
  static Just = <A>(a: A) => new Maybe('Just', a);
  static Nothing = <A = unknown>() => new Maybe<A>('Nothing' as 'Nothing');

  // Predicates for imperative checks.

  static is(inst: unknown): inst is Maybe<unknown> {
    return inst != null && inst instanceof Maybe;
  }

  static isTag<
    TTagName extends TaggedSumTagNames<Maybe<any>>
  >(type: TTagName, inst: unknown): inst is TaggedSumSpecializedTo<Maybe, TTagName> {
    return Maybe.is(inst) && inst.type[0] === type;
  }

  constructor(...type: TaggedSumTagDefs<Maybe<A>>) {
    super('Maybe', type);
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
