// The principle is as above: The View must always receive something to render,
// and errors are part of that something to render.
// The constructs here are to enforce consideration of all cases because not handling any cases
// means you may have undefined behavior.
// Additionally, it provides explicit documentation within the view about what case leads to what.

// This is a purely object/function based implementation.

// Kinda clunky, but I guess the intentended method of use is
// import * as AsyncData from 'utils/asyncdata'
// AsyncData.$Result('foo')
// AsyncData.cata(props.foo, { [AsyncData.Status.NotAsked]: () => 'not asked', ... })
// AsyncData.map(props.foo, foo => foo.bars.map(bar => getBar(state, bar)))

enum Status {
  NotAsked = 'NotAsked',
  Waiting = 'Waiting',
  Error = 'Error',
  Result = 'Result',
}

// a prop named `status` is used because JS does not have tagged types.
export type AsyncData<ResultT, ErrorT>
  = { status: Status.NotAsked }
  | { status: Status.Waiting }
  | { status: Status.Error; error: ErrorT }
  | { status: Status.Result; result: ResultT }
  ;


// These are global const, so we can just do whatever.
const $$AsyncDataNotAsked: AsyncData<any, any> = { status: Status.NotAsked };
const $$AsyncDataWaiting: AsyncData<any, any> = { status: Status.Waiting };

export function $NotAsked() { return $$AsyncDataNotAsked; }
export function $Waiting() { return $$AsyncDataWaiting; }
export function $Error<E>(error: E) { return ({ status: Status.Error, error }) as AsyncData<any, E>; }
export function $Result<R>(result: R) { return ({ status: Status.Result, result }) as AsyncData<R, any>; }


interface AsyncDataCaseMap<RT, ET, N, W, E, R> {
  [Status.NotAsked](): N;
  [Status.Waiting](): W;
  [Status.Error](e: ET): E;
  [Status.Result](r: RT): R;
}

// This function basically exists only because JS doesn't have an ML-style match/case thing.
function cata<ResultT, ErrorT, N, W, E, R>(
  asyncData: AsyncData<ResultT, ErrorT>,
  caseMap: AsyncDataCaseMap<ResultT, ErrorT, N, W, E, R>
): (N | W | E | R) {
  // TODO: enforce caseMap having exactly those cases specified.  No defaults behavior.
  switch (asyncData.status) {
    case Status.NotAsked: return caseMap.NotAsked();
    case Status.Waiting: return caseMap.Waiting();
    case Status.Error: return caseMap.Error(asyncData.error);
    case Status.Result: return caseMap.Result(asyncData.result);
  }
}

// Covers the most common use.
// :: AsyncData<A, E> => (A => B) => AsyncData<B, E>
function map<A, B, ErrorT>(
  asyncData: AsyncData<A, ErrorT>,
  fn: ((a: A) => B)
): AsyncData<B, ErrorT> {
  // Normally this would be implemented in terms of cata(),
  // but TS no likey just returning asyncData as-is there; says it can't assign A to B.
  // Bah.
  switch (asyncData.status) {
    case Status.NotAsked:
    case Status.Waiting:
    case Status.Error:
      return asyncData;

    case Status.Result:
      return ({ status: Status.Result, result: fn(asyncData.result)});
  }
}

// Mostly used to map errors to descriptive messages.
// :: AsyncData<A, Ea> => (Ea => Eb) => AsyncData<A, Eb>
function mapError<A, Ea, Eb>(
  asyncData: AsyncData<A, Ea>,
  fn: ((a: Ea) => Eb)
): AsyncData<A, Eb> {
  // Normally this would be implemented in terms of cata(),
  // but TS no likey just returning asyncData as-is there; says it can't assign A to B.
  // Bah.
  switch (asyncData.status) {
    case Status.NotAsked:
    case Status.Waiting:
    case Status.Result:
      return asyncData;

    case Status.Error:
      return ({ status: Status.Error, error: fn(asyncData.error) });
  }
}

// AsyncData<AsyncData<A, any>, E> => AsyncData<A, E>
function unnest<R, Ea, Eb>(nestedAsyncData: AsyncData<AsyncData<R, Eb>, Ea>): AsyncData<R, Ea | Eb> {
  return cata(nestedAsyncData, {
    [Status.NotAsked]: () => nestedAsyncData as AsyncData<any, any>,
    [Status.Waiting]: () => nestedAsyncData as AsyncData<any, any>,
    [Status.Error]: () => nestedAsyncData as AsyncData<any, Ea>,
    [Status.Result]: (result) => result as AsyncData<R, any>,
  });
}

// :: AsyncData<A, Ea> => (A => AsyncData<B, Eb>) => AsyncData<B, Ea | Eb>
function flatMap<A, B, Ea, Eb>(asyncData: AsyncData<A, Ea>, fn: (a: A) => AsyncData<B, Eb>) {
  return unnest(map(asyncData, fn));
}

// Not actually sure how to do this one without specifying separate overloads,
// because we're really dealing with tuples here, not lists.
// Not sure this plays nice with static typing in any language.
// It may be better to just use map a bunch to handle our things.
// Man, if we had, I dunno, a bind operator...
function concat<Ra, Rb, Ea, Eb>(rds: [AsyncData<Ra, Ea>, AsyncData<Rb, Eb>]): AsyncData<[Ra, Rb], (Ea | Eb)>;
function concat<Ra, Rb, Rc, Ea, Eb, Ec>(rds: [AsyncData<Ra, Ea>, AsyncData<Rb, Eb>, AsyncData<Rc, Ec>]): AsyncData<[Ra, Rb, Rc], (Ea | Eb | Ec)>;
function concat(rds) {
  return rds.slice(1).reduce(
    (acc, rd) => flatMap(acc, accRes => map(rd, res => [...accRes, res])),
    map(rds[0], res => [res])
  );
}

// I guess the alternative is basically this:
// unnest(map(foo, fooRes => unnest(map(bar, barRes => map(baz, bazRes =>
//   // Or whatever else you want to do with all of them.
//   [fooRes, barRes, bazRes]
// )))));
// Um.  Maybe not.  Let concat handle that, even if it's interface has to be expanded periodically.
// (If JS were OCaml this would be easier :P)
// At least flatMap(foo, fooRes => flatMap(bar, barRes => map(baz, bazRes =>
//   [fooRes, barRes, bazRes]
// ))) is not as bad.
// concat([foo, bar, baz]) is easier, though.

const initRes = $Result('foo');
const mappedRes = map(initRes, str => str.length);
console.log('initRes, mappedRes:', initRes, mappedRes);

const concattedRes = concat([initRes, mappedRes])
const concattedMappedRes = map(concattedRes, ([str, num]) => Array.apply(null, Array(num)).map(() => str))
console.log('concattedRes:', concattedRes);
console.log('concattedMappedRes:', concattedMappedRes);

function logAsyncData<R, E>(asyncData: AsyncData<R, E>) {
  console.log('logAsyncData:', ...cata(asyncData, {
    // Log it in a form that is more technically accurate, but hell to deal with in JS land, heh.
    [Status.NotAsked]: () => [Status.NotAsked],
    [Status.Waiting]: () => [Status.Waiting],
    [Status.Error]: (error) => [Status.Error, error],
    [Status.Result]: (result) => [Status.Result, result],
  }))
}

logAsyncData($NotAsked());
logAsyncData($Waiting());
logAsyncData($Error(new Error('No! >:(')));
logAsyncData($Result({ message: 'Yay!' }));
