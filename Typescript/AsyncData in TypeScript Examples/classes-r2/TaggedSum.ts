/*
 * Third whack at Class-Based Tagged Sums.
 *
 * Taking the lessons from r1, this uses an abstract base class for TaggedSum itself,
 * which is extended by implementations.  This time, I'm going back to the map based
 * definition instead of the tuple-union based definition.
 *
 * Unfortunately, this one doesn't seem to work as well due to needing to coordinate
 * two separate types for the Tag and Tag Values.  With the Tuple Union based setup,
 * those two were intrinsically tied, but here they're separate.
 */

abstract class TaggedSum<
  TSum extends string,
  TDef extends { [k: string]: any[] },
  // A specific instance will have a specific TTag, but if you don't
  // specify, then it's a union of all possible tags.
  TTag extends keyof TDef = keyof TDef
> {
  sum: TSum;
  tag: TTag;
  values: TDef[TTag];

  constructor(sum: TSum, tag: TTag, values: TDef[TTag]) {
    this.sum = sum;
    this.tag = tag;
    this.values = values;
  }

  public cata<T extends AnyTaggedSum, H extends TaggedSumCataHandlers<T>>(this: T, handlers: H): ReturnType<H[TaggedSumTypeNames<T>]> {
    return handlers[this.type[0]](...this.type.slice(1));
  }
}

class Maybe<A> extends TaggedSum<'Maybe', {
  Nothing: [],
  Just: [A],
}> {
}

const _maybe0: Maybe<number> = new Maybe('Maybe', 'Just', [5]);
const _maybe1: Maybe<number> = new Maybe('Maybe', 'Nothing', [5]);
