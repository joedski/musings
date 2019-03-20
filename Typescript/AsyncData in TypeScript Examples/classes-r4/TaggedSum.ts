abstract class _TaggedSum<
  TSumName extends string,
  TDefs extends { [k: string]: <A extends any[]>(...args: A) => A; }
> {
  protected abstract sum: TSumName;
  protected abstract defs: TDefs;
  protected tag: AnyTaggedSumValue<TDefs>;

  constructor(...tag: TaggedSumCtorArgs<TDefs>) {
    this.tag = tag;
  }
}



function EitherDefs<L, R>() {
  return {
    Left: (l: L): [L] => [l],
    Right: (r: R): [R] => [r],
  };
}

type _EitherDefsReturn = (typeof EitherDefs);

class Either<L, R>
extends _TaggedSum<'Either', ReturnType<typeof EitherDefs>> {
  protected sum = 'Either' as 'Either';
  protected defs = EitherDefs<L, R>();
}
