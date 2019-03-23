import TaggedSum, {
  TaggedSumTagDefs,
  TaggedSumTagNames,
  TaggedSumSpecializedTo,
  ValuesFactories,
} from './TaggedSum';

type AsyncDataTags<D, E> =
  | ['NotAsked']
  | ['Waiting']
  | ['Data', D]
  | ['Error', E]
  ;

const asyncDataValuesFactories = {
  NotAsked: <D, E>(): [] => [],
  Waiting: <D, E>(): [] => [],
  Data: <D, E>(d: D): [D] => [d],
  Error: <D, E>(e: E): [E] => [e],
};

export default class AsyncData<D = unknown, E = unknown>
extends TaggedSum<'AsyncData', AsyncDataTags<D, E>> {
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

  /**
   * Coalesces a tuple of AsyncData instances down to a single AsyncData instance
   * whose Data type param is a tuple of all the inputs' Data type params, and whose
   * Error type param is a Union of all the inputs' Error type params.
   *
   * NOTE: Unlike with `Promise.all`, you do NOT pass an array to this function.
   *
   * Example:
   *
   *     let foo: AsyncData<number, Error>;
   *     let bar: AsyncData<string, Error>;
   *     let baz: AsyncData<{ baz: string }, { error: Error }>;
   *
   *     // Type: AsyncData<[number, string, { baz: string; }], Error | { error: Error; }>
   *     const allThemData = AsyncData.all(foo, bar, baz);
   *
   * Literally just reduces over the tuple using the coalesce method.
   * @param allInsts A tuple of AsyncData instances
   */
  // Had to use rest-args to do this because TS treats array arguments vs rest args differently.
  // Less symmetrical to Promise.all(), but oh well.
  public static all<TAllInsts extends Array<AsyncData<any, any>>>(...allInsts: TAllInsts): AsyncDataAllReturnType<TAllInsts> {
    return allInsts.reduce(
      (acc, next) => acc.coalesce(next, (accData: any[], nextData: any) => {
        accData.push(nextData);
        return accData;
      }),
      AsyncData.Data([])
    );
  }

  public get sum() { return 'AsyncData' as 'AsyncData'; }
  public get valuesFactories() { return asyncDataValuesFactories as ValuesFactories<AsyncDataTags<D, E>>; }

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
      NotAsked: () => this as unknown as AsyncData<DI, E | EI>,
      Waiting: () => this as unknown as AsyncData<DI, E | EI>,
      Error: () => this as unknown as AsyncData<DI, E | EI>,
      Data: (data: AsyncData<DI, EI>) => data as AsyncData<DI, E | EI>,
    });
  }

  flatMap<DB, EB>(fn: (a: D) => AsyncData<DB, EB>): AsyncData<DB, E | EB> {
    return this.map(fn).flatten();
  }

  coalesce<Do, Eo, Dm>(other: AsyncData<Do, Eo>, merge: (thisData: D, otherData: Do) => Dm): AsyncData<Dm, E | Eo> {
    if (AsyncData.isTag('Error', this)) return this as unknown as AsyncData<Dm, E | Eo>;
    if (AsyncData.isTag('Error', other)) return other as unknown as AsyncData<Dm, E | Eo>;
    if (AsyncData.isTag('Waiting', this)) return this as unknown as AsyncData<Dm, E | E | Eo>;
    if (AsyncData.isTag('Waiting', other)) return other as unknown as AsyncData<Dm, E | Eo>;
    if (AsyncData.isTag('NotAsked', this)) return this as unknown as AsyncData<Dm, E | E | Eo>;
    if (AsyncData.isTag('NotAsked', other)) return other as unknown as AsyncData<Dm, E | Eo>;

    // now both should be 'Data'.
    return this.flatMap(thisData => other.map(otherData => merge(thisData, otherData)));
  }
}

/**
 * Return type of `AsyncData.all()`.
 */
type AsyncDataAllReturnType<TAllInsts extends Array<AsyncData<any, any>>> =
  AsyncData<
    { [I in keyof TAllInsts]: TAllInsts[I] extends AsyncData<infer R, any> ? R : never; },
    TAllInsts extends Array<AsyncData<any, infer TError>> ? TError : never
  >;
