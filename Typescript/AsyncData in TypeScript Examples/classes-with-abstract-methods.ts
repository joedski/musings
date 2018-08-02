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

type ImplementationFactory<C, F extends (...args: any[]) => C> =
  F & { is(inst: any): boolean };

// This mostly exists to tell Typescript stuff.
function createImplementationFactory<C extends AsyncData, F>(implClass: C, factory: F): ImplementationFactory<C, F> {
  factory.is = function $testInstance(inst) {
    return inst instanceof implClass;
  };

  return factory;
}

abstract class AsyncData<RT, ET> {
  // These are provided as the primary way to access this type.
  static NotAsked = createImplementationFactory(AsyncDataNotAsked, () => $$NotAsked)
  static Waiting = createImplementationFactory(AsyncDataWaiting, () => $$Waiting)
  static Error = createImplementationFactory(
    AsyncDataError,
    <ET>(error: ET) => new AsyncDataError(error)
  )
  static Result = createImplementationFactory(
    AsyncDataResult,
    <RT>(error: RT) => new AsyncDataResult(result)
  )

  // Not possible to generalize until we have variadic kinds.
  // Which is to say, handling n-tuples rather than specific-length-tuples.
  static concat<R0, R1, E0, E1>(rds: [AsyncData<R0, E0>, AsyncData<R1, E1>]): AsyncData<[R0, R1], (E0 | E1)>;
  static concat<R0, R1, R2, E0, E1, E2>(rds: [AsyncData<R0, E0>, AsyncData<R1, E1>, AsyncData<R2, E2>]): AsyncData<[R0, R1, R2], (E0 | E1 | E2)>;
  static concat<R0, R1, R2, R3, E0, E1, E2, E3>(rds: [AsyncData<R0, E0>, AsyncData<R1, E1>, AsyncData<R2, E2>, AsyncData<R3, E3>]): AsyncData<[R0, R1, R2, R3], (E0 | E1 | E2 | E3)>;
  static concat(rds) {
    return rds.slice(1).reduce(
      (acc, rd) => acc.flatMap(reses => rd.map(res => [...reses, res])),
      rds[0].map(res => [res])
    );
  }

  abstract cata<N, W, E, R>(caseMap: AsyncDataCaseMap<RT, ET, N, W, E, R>): N | W | E | R;
  abstract map<RTb>(fn: (a: RT) => RTb): AsyncData<RTb, ET | Error>;
  abstract mapError<ETb>(fn: (a: ET) => ETb): AsyncData<RT, ETb | Error>;
  abstract unnest<A, ETA>(this: AsyncData<AsyncData<A, ETA>, ET>): AsyncData<A, ETA | ET>;

  flatMap<RTB, ETB>(fn: (a: RT) => AsyncData<RTB, ETB>) {
    return this.map(fn).unnest();
  }
}

class AsyncDataNotAsked extends AsyncData<any, any> {
  cata(caseMap) {
    return caseMap.NotAsked();
  }

  map(fn) {
    return this;
  }

  mapError(fn) {
    return this;
  }

  unnest() {
    return this;
  }
}

class AsyncDataWaiting extends AsyncData<any, any> {
  cata(caseMap) {
    return caseMap.Waiting();
  }

  map(fn) {
    return this;
  }

  mapError(fn) {
    return this;
  }

  unnest() {
    return this;
  }
}

class AsyncDataError<ErrorT> extends AsyncData<any, ErrorT> {
  error: ErrorT;

  constructor(error: ErrorT) {
    super();
    this.error = error;
  }

  cata(caseMap) {
    return caseMap.Error(this.error);
  }

  map(fn) {
    return this;
  }

  mapError(fn) {
    try {
      return AsyncData.Error(fn(this.error));
    }
    catch (error: Error) {
      return AsyncData.Error(error);
    }
  }

  unnest() {
    return this;
  }
}

class AsyncDataResult<ResultT> extends AsyncData<ResultT, any> {
  result: ResultT;

  constructor(result: ResultT) {
    super();
    this.result = result;
  }

  cata(caseMap) {
    return caseMap.Result(this.result);
  }

  map(fn) {
    try {
      return AsyncData.Result(fn(this.result));
    }
    catch (error: Error) {
      return AsyncData.Error(error);
    }
  }

  mapError(fn) {
    return this;
  }

  unnest() {
    return this.result;
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
