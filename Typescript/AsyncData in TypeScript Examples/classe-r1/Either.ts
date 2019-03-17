import TaggedSum, {
  TaggedSumTagDefs,
} from './TaggedSum';

export default class Either<L, R>
extends TaggedSum<'Either',
  | ['Left', L]
  | ['Right', R]
> {
  static Left = <L, R>(left: L) => new Either<L, R>('Left', left);
  static Right = <L, R>(right: R) => new Either<L, R>('Right', right);

  constructor(...type: TaggedSumTagDefs<Either<L, R>>) {
    super('Either', type);
  }
}
