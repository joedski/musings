import TaggedSum, {
  TaggedSumTagDefs,
  TaggedSumTagNames,
  TaggedSumSpecializedTo,
} from './TaggedSum';

export default class AsyncData<D = unknown, E = unknown>
extends TaggedSum<'AsyncData',
  | ['NotAsked']
  | ['Waiting']
  | ['Data', D]
  | ['Error', E]
> {
  static NotAsked = <D, E>() => new AsyncData<D, E>('NotAsked');
  static Waiting = <D, E>() => new AsyncData<D, E>('Waiting');
  static Error = <D, E>(error: E) => new AsyncData<D, E>('Error', error);
  static Data = <D, E>(data: D) => new AsyncData<D, E>('Data', data);

  static is(inst: unknown): inst is AsyncData<any, any> {
    return inst != null && inst instanceof AsyncData;
  }

  static isTag<
    TTagName extends TaggedSumTagNames<AsyncData<any, any>>
  >(type: TTagName, inst: unknown): inst is TaggedSumSpecializedTo<AsyncData<any, any>, TTagName> {
    return AsyncData.is(inst) && inst.type[0] === type;
  }

  constructor(...type: TaggedSumTagDefs<AsyncData<D, E>>) {
    super('AsyncData', type);
  }

  map<DB>(fn: (data: D) => DB): AsyncData<DB, E> {
    return this.cata({
      // In these cases, we know that "this" is compatible with AsyncData<DB, E>,
      // but TS has no way of knowing that in any given handler.
      // So, coerce, coerce, coerce.  Woo.
      NotAsked: () => this as unknown as AsyncData<DB, E>,
      Waiting: () => this as unknown as AsyncData<DB, E>,
      Error: () => this as unknown as AsyncData<DB, E>,
      // TS auto-infers AsyncData<DB, DB> for some reason, so being explicit.
      Data: (data: D) => new AsyncData<DB, E>('Data', fn(data)),
    });
  }

  flatten<DI, EI>(this: AsyncData<AsyncData<DI, EI>, E>): AsyncData<DI, E | EI> {
    return this.cata({
      NotAsked: () => this as unknown as AsyncData<DI, E>,
      Waiting: () => this as unknown as AsyncData<DI, E>,
      Error: () => this as unknown as AsyncData<DI, E>,
      Data: (data: AsyncData<DI, EI>) => data,
    });
  }

  flatMap<DB, EB>(fn: (a: D) => AsyncData<DB, EB>): AsyncData<DB, E | EB> {
    return this.map(fn).flatten();
  }

  coalesce<Do, Eo, Dm>(other: AsyncData<Do, Eo>, merge: (thisData: D, otherData: Do) => Dm): AsyncData<Dm, E | Eo> {
    if (AsyncData.isTag('Error', this)) return this as unknown as AsyncData<Dm, E>;
    if (AsyncData.isTag('Error', other)) return other as unknown as AsyncData<Dm, Eo>;
    if (AsyncData.isTag('Waiting', this)) return this as unknown as AsyncData<Dm, E>;
    if (AsyncData.isTag('Waiting', other)) return other as unknown as AsyncData<Dm, Eo>;
    if (AsyncData.isTag('NotAsked', this)) return this as unknown as AsyncData<Dm, E>;
    if (AsyncData.isTag('NotAsked', other)) return other as unknown as AsyncData<Dm, Eo>;

    // now both should be 'Data'.
    return this.flatMap(thisData => other.map(otherData => merge(thisData, otherData)))
  }
}
