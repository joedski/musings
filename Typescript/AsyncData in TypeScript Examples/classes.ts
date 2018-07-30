/**
 * An object describing what to do with each case for an AsyncData instance.
 * The omission of an Else/_ case is intentional:
 * - Implementation is simpler
 * - Typescript can tell you if you missed a case
 * - Usage is more explicit, which is better documentation
 */
interface AsyncDataCaseMap<RT, ET, N, W, E, R> {
  NotAsked(): N;
  Waiting(): W;
  Error(e: ET): E;
  Result(r: RT): R;
}

abstract class AsyncData<RT, ET> {
  // These are provided as the primary way to access this type.
  static NotAsked() { return $$NotAsked; }
  static Waiting() { return $$Waiting; }
  static Error<ET>(error: ET) { return new AsyncDataError(error); }
  static Result<RT>(result: RT) { return new AsyncDataResult(result); }

  // Not possible to generalize until we have variadic kinds.
  // Which is to say, handling n-tuples rather than specific-length-tuples.
  static concat<Ra, Rb, Ea, Eb>(rds: [AsyncData<Ra, Ea>, AsyncData<Rb, Eb>]): AsyncData<[Ra, Rb], (Ea | Eb)>;
  static concat<Ra, Rb, Rc, Ea, Eb, Ec>(rds: [AsyncData<Ra, Ea>, AsyncData<Rb, Eb>, AsyncData<Rc, Ec>]): AsyncData<[Ra, Rb, Rc], (Ea | Eb | Ec)>;
  static concat(rds) {
    return rds.slice(1).reduce(
      (acc, rd) => acc.flatMap(reses => rd.map(res => [...reses, res])),
      rds[0].map(res => [res])
    );
  }

  cata<N, W, E, R>(caseMap: AsyncDataCaseMap<RT, ET, N, W, E, R>) {
    if (this instanceof AsyncDataNotAsked) return caseMap.NotAsked();
    if (this instanceof AsyncDataWaiting) return caseMap.Waiting();
    if (this instanceof AsyncDataError) return caseMap.Error(this.error);
    if (this instanceof AsyncDataResult) return caseMap.Result(this.result);
  }

  map<RTb>(fn: (a: RT) => RTb): AsyncData<RTb, ET> {
    return this.cata({
      // The use of casting/assertion here is slightly naughty
      // because technically nothing outside of cata() can actually
      // know what cata is doing to check the types.
      // Properly, these always call the constructors,
      // but I did this because it's correct, albeit not Correct.
      NotAsked: () => this as AsyncData<any, any>,
      Waiting: () => this as AsyncData<any, any>,
      Error: () => this as AsyncData<any, ET>,
      Result: (result) => (AsyncData.Result(fn(result)) as AsyncData<RTb, any>),
    });
  }

  mapError<ETb>(fn: (a: ET) => ETb): AsyncData<RT, ETb> {
    return this.cata({
      NotAsked: () => this as AsyncData<any, any>,
      Waiting: () => this as AsyncData<any, any>,
      Error: (error) => (AsyncData.Error(fn(error))),
      Result: () => this as AsyncData<RT, any>,
    });
  }

  unnest<A, ETA>(this: AsyncData<AsyncData<A, ETA>, ET>) {
    return this.cata({
      NotAsked: () => this,
      Waiting: () => this,
      Error: () => this,
      Result: (result) => result,
    });
  }

  flatMap<RTB, ETB>(fn: (a: RT) => AsyncData<RTB, ETB>) {
    return this.map(fn).unnest();
  }
}

class AsyncDataNotAsked extends AsyncData<any, any> {}

class AsyncDataWaiting extends AsyncData<any, any> {}

class AsyncDataError<ErrorT> extends AsyncData<any, ErrorT> {
  error: ErrorT;

  constructor(error: ErrorT) {
    super();
    this.error = error;
  }
}

class AsyncDataResult<ResultT> extends AsyncData<ResultT, any> {
  result: ResultT;

  constructor(result: ResultT) {
    super();
    this.result = result;
  }
}

// Static values as mild optimization.
const $$NotAsked = new AsyncDataNotAsked();
const $$Waiting = new AsyncDataWaiting();



//////// Demos

const initRes = AsyncData.Result('foo');
const mappedRes = initRes.map(str => str.length);
console.log('initRes, mappedRes:', initRes, mappedRes);

const justWaiting = AsyncData.Waiting().map(() => 'foo');
console.log('AsyncData.Waiting().map(() => "foo"):', AsyncData.Waiting().map(() => 'foo'));

const concattedRes = AsyncData.concat([initRes, mappedRes]);
const concattedMappedRes = concattedRes.map(([str, num]) => (Array.apply(null, Array(num)) as Array<void>).map(() => str));
console.log('concattedRes:', concattedRes);
console.log('concattedMappedRes:', concattedMappedRes);

const manuallyConcattedRes = initRes.flatMap(str => mappedRes.map(num => [str, num] as [string, number]));
const manuallyConcattedMappedRes = concattedRes.map(([str, num]) => (Array.apply(null, Array(num)) as Array<void>).map(() => str));
console.log('manuallyConcattedRes:', manuallyConcattedRes);
console.log('manuallyConcattedMappedRes:', manuallyConcattedMappedRes);

function logAsyncData<R, E>(asyncData: AsyncData<R, E>) {
  console.log('logAsyncData:', ...asyncData.cata({
    // Log it in a form that is more technically accurate, but hell to deal with in JS land, heh.
    NotAsked: () => ['NotAsked'],
    Waiting: () => ['Waiting'],
    Error: (error) => ['Error', error],
    Result: (result) => ['Result', result],
  }));
}

logAsyncData(AsyncData.NotAsked());
logAsyncData(AsyncData.Waiting());
logAsyncData(AsyncData.Error(new Error('No! >:(')));
logAsyncData(AsyncData.Result({ message: 'Yay!' }));
