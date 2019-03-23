import TaggedSum, { ValuesFactories } from './TaggedSum';

type EitherTags<L, R> =
  | ['Left', L]
  | ['Right', R]
  ;

const eitherFactories = {
  Left: <L, R>(l: L): [L] => [l],
  Right: <L, R>(r: R): [R] => [r],
};

export default class Either<L, R> extends TaggedSum<'Either', EitherTags<L, R>> {
  public static Left = <L, R>(l: L) => new Either<L, R>('Left', l);
  public static Right = <L, R>(r: R) => new Either<L, R>('Right', r);

  public get sum() { return 'Either' as 'Either'; }
  public get valuesFactories() { return eitherFactories as ValuesFactories<EitherTags<L, R>>; }
}
