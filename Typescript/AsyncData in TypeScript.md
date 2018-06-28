AsyncData in Typescript
=======================

I wanted to do the equivalent of [this pattern](https://medium.com/javascript-inside/slaying-a-ui-antipattern-in-react-64a3b98242c) in a Typescript project, but [daggy](https://github.com/fantasyland/daggy) doesn't have Typescript types, and honestly I'm not sure how to strongly specify how it would work.  Lots of `keysof` and such, but the biggest thing is I don't know how to take a tuple of strings and use that to specify object properties, which is one of the main parts of daggy's interface.

Since I need this sooner than later, I'll just try implementing a bespoke thing.



## Try 1: Objects and Functions

My first thought is to just use objects and functions, because they are clearly superior to classes.  The [implementation I came up with](./AsyncData%20in%20TypeScript%20Examples/objects-and-functions.ts) was noisier, though, so in this case my assertion of superiority was not so correct.



## Try 2: Classes

I'm nothing if not pragmatic.  I figured there must be an easier way to do it.  The tagged types in daggy are basically subclasses of the sum type, so I figured I could engage in some "class extends base" work.  The [implementation I came up with using classes](./AsyncData%20in%20TypeScript%20Examples/classes.ts) came out much cleaner than the other one.  Oh well.

It also allows method-chaining, which is okay, but not as nice as plain function composition or flowing.  Oh well, it's JS not OCaml.  Shame we don't have an official bind operator, nor a pipe operator.

For the most common case, we get a very javascripty look:

```js
enhancedFetch(apiRequests.thingy(thingyId))
  .then(res => res
    .map(data => notify({
      ...
    }))
    .mapError(error => {
      const message = (() => {
        if (error instanceof Response) {
          return 'Some server error';
        }
        if (error instanceof Error) {
          return error.message;
        }
        return 'Some unknown error';
      })();

      notify({
        ...
      });
    })
  );
```



## Other Thoughts

Neither implementation includes the ability to check types separately and, for the use cases I'm considering, I don't think that's really necessary.  Every case is better handled with `inst.cata()`.



## Component Enhancing Func: AsyncData Edition

Typescript gives you tools for building up types, as should be expected in any mature JS-With-Types language.  Flow usually has theirs prefixed with a `$`, but Typescript just adds more unprefixed key words.

I suppose for this, we'd need to use the key-iteration-and-indexing trick, `{ [K in keyof T]: T[K]... }`.

To start with, I'll need to just draft what I want to happen, then see if I can rigorously describe that.

```js
// asyncData can be either arity-0 or arity-1, where the 1 argument is the current props.
// Note that accepting props means it will be re-evaluated every time props change,
// thus every time the component is redrawn.
// It can also be a function-creator, like with react-redux connect().
// :: () => { foo: () => AsyncThunk<Response, Error>, bar: () => ..., baz: (number) => ... }
const mapToAsyncGetterProps: () => ({
  foo: fetchFoo,
  bar: () => fetchBar(3),
  baz: (bazId) => fetchBaz(bazId),
});

// :: Component<BaseProps, BaseState> => Component<BaseProps & AsyncProps, BaseState>
const withAsyncData = connectAsyncData(mapToAsyncGetterProps);

export default withAsyncData(connect(mapState, mapDispatch)(Component));
```

Since `mapToAsyncGetterProps` may be either 0-arity or 1-arity, we'll need a couple interfaces.

```js
interface MapToAsyncGetterProps<T> {
  (): T;
}

interface MapPropsToAsyncGetterProps<T, BaseProps> {
  (props: BaseProps): T;
}
```

Dunno if they can be named the same thing or not.  Anyway, those are really pretty boring, and don't do anything about the cached-selector usage, though I don't think that'll be necessary since all the callbacks will be hidden behind bound-callbacks.

```js
interface AsyncProps<T, K extends keyof T, > {
  [K in keyof T]: // ... ?
}

// :: Component<BaseProps, BaseState> => Component<BaseProps & AsyncProps, BaseState>
function connectAsyncData<T, AP, BP, BS>(
  mapToGetters: MapToAsyncGetterProps<T> | MapPropsToAsyncGetterProps<T, BP>
) {

}
```

Hm.  Need to figure out how to refer to just the return value of an indexed object.

- I know `K in keyof T` will have a specific `K` for a given key in `T`, rather than just any old key.
- I know that `T[K]` now refers specifically to the type of the member at the specific `K` on `T`.
  - In the above case, it's either `() => AsyncThunk<Response, Error>` or `(...params) => AsyncThunk<Response, Error>` where `AsyncThunk :: (dispatch, getState) => Promise<Response, Error>`
    - We don't really care about the input parameters... except we do.

So, I think what we want then is something like this:

- Given `(...params?) => AsyncThunk<Response, Error>`
- We want: `(...params?) => AsyncData<Data, Error | ErrorResponse>`
  - Idly, I'm not sure there's a way to specify `Data` yet... Problematic.  Though, maybe not given that in the current project we usually ignore that in favor of selecting from Redux.

Although, the real problem is that we don't actually know what the Resolution type is.  All we know is we get a Promise.  Technically we don't even know what the Error type is, either.  All this means we actually have `AsyncThunk<R, E> :: (dispatch, getState) => Promise<R, E>`, and `R` and `E` may very well be different per `T[K]`.

Ultimately, it should end up going like this, I guess?

```
Receive: <T> {
  <A, R, E>[K in keyof T]: T[K]{ (A): Promise<R, E>; };
}

Return: <T> {
  <A, R, E>[K in keyof T]: T[K]{ (A): AsyncData<R, E>; }
}
```

... or something like that?

Hm.  Well, the `pluck` example they have goes like this:

```js
function pluck<T, K extends keyof T>(o: T, names: K[]): T[K][] {
  return names.map(n => o[n]);
}

interface Person {
    name: string;
    age: number;
}
let person: Person = {
    name: 'Jarid',
    age: 35
};
let strings: string[] = pluck(person, ['name']); // ok, string[]
```

Here, we have both the parametrization of `K extends keyof T` and the typing of `K[]`, which Typescript takes to mean a List of K, where K is the union type `'propA' | 'propB' | ...` where each of those strings is a property name on `T`.  Hence, the array can only contain strings which are keys of `T`.  (The Array could contain multiple instances of any given `K`, although for `pluck` that doesn't really do much.)

Also note the return type `T[K][]`, meaning an Array of Properties (by key) of `T`.

So, given `T` and `K extends keyof T`, we get:
- `T`, some Object.
- `K`, Union of all Keys of `T`.
- `Ka in K`, Iteration over each Union Member in `K`.
- `T[K]`, the Type of the Property `K` of Object `T`.

Then, given two wrappers `WA<A, B>` and `WB<A, B>` we can also specify a function which maps one to the other: `<A, B>((...?) => WA<A, B>) => WB<A, B>`

Well, so for each `Ka in K`, we take that as a function `AsyncFunction<R, E> = (...?) => (dispatch, getState) => Promise<R, E>` and return a function `AsyncDataGetter<R, E> = (...?) => Promise<AsyncData<R, E>, {}>`.

We also create a prop `AsyncData<R, E>` to pass down directly.

Hmmm.

Could I create a simple interface where I have an object-map of functions and want to specify an object map of boxed values?  `{ foo(): FooT, bar(): BarT, ... }` to `{ foo: { value: FooT }, bar: { value: BarT } }`, basically.

Actually, looks like we already have a built in `ReturnValue<FuncT>` which is a type that's the return type of function type `FuncT`.  In fact, there're a bunch of utility types.  Hm!  Even [Conditional Types](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html#distributive-conditional-types)!  The [section on Advanced Types](https://www.typescriptlang.org/docs/handbook/advanced-types.html) mentions `Readonly<T>`, `Partial<T>`, `Pick<T, K extends keyof T>`, and `Record<K extends string, T>` as standard types, but I don't see a list of such types described anywhere else.  This is extremely irritating.

Apparently they're declared in [`src/lib/es5.d.ts`](https://github.com/Microsoft/TypeScript/blob/master/src/lib/es5.d.ts).  Bleh.  There's also an [`Omit<T>`](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/react-redux/index.d.ts#L45) type defined in Redux's types, but there's apparently no standard definition yet, so caveat emptor.

Anyway, we see a bunch of those utility things, including `ReturnType<T>`:

```js
/**
 * Obtain the return type of a function type
 */
type ReturnType<T extends (...args: any[]) => any> = T extends (...args: any[]) => infer R ? R : any;
```

It also makes use of the `infer` key word which I guess is meant to be internal since I haven't seen it mentioned anywhere.

At the very least, though, I can get the return type without repeating the work of creating a ReturnType type.  Not sure I knew enough to actually create that type, either.

That gives me enough to create a Requestor prop, at least.  I think.

So, to reiterate:
- On each prop of the original object we expect a function:
  - `<R, E>(...args: any[]) => Promise<R, E>`
- We want to give back another function using the same `R` and `E` with the shape:
  - `<R, E>(...args: any[]) => Promise<AsyncData<R, E>, ...?>`
    - We convert errors to `AsyncData.Error` so we don't (shouldn't) ever encounter the error case of a Promise.  Would `never` be appropriate there or just `any`?  Or `Error`?  Hm.

```js
interface Requestor<AsyncFn extends (...args: any[]) => Promise<infer R, infer E>> {
  (...args: any[]): Promise<AsyncData<R, E>, Error>;
}
```

No, that doesn't work for a couple reasons:
- Error: 'infer' declarations are only permitted in the 'extends' clause of a conditional type.
- Promise only takes one type parameter!  This is different from Flow.  Good to know.
  - So, for `AsyncData`, we'll need to define an Error type.  That's fine for us.

Okay, maybe I can simplify this a bit?  Maybe just create two boxes:

```js
interface BoxA<T> {
  a: T;
}

interface BoxB<T> {
  b: T;
}

type BoxerBofA<T extends () => BoxA<any>> =
  T extends () => infer BoxA<R> ? () => BoxB<R> : never;
```

Okay, not quite, it can't find R.

```js
interface BoxA<T> {
  a: T;
}

interface BoxB<T> {
  b: T;
}

type BoxerBofBoxerA<T extends () => BoxA<any>> =
  T extends <R>() => BoxA<R> ? <R>() => BoxB<R> : never;
```

That parses, but the two `R` parametrizations are unrelated, which is not what we want.  We want to be able to just do `BoxerBofBoxerA<FnBA>`

```js
type BoxerA<T> = () => BoxA<T>;
type BoxerB<T> = () => BoxB<T>;

// BoxA<T> === ReturnValue<BoxerA<T>>

// But how do we get T?
type BoxerBofBoxerA<T, BoxerA<T>> = BoxerB<T>;
```

Hm.

```js
interface Boxers<C> {
  //                      ????
  [Ka in keyof C]: C[Ka] extends BoxerA<T> ? BoxerBofBoxerA<C[Ka]> : never;
}
```

Still not quite understanding things here.  Hmmmmmmmmmmm.



## Try 3: Just Do It Again

After poking random strings of code for a bit, I realized I can just [do the exact same thing as `ReturnType<T>` to unbox types](https://gist.github.com/joedski/5607d1310971e2d0ce8ad3747cb5805b):

```js
interface Box<T> {
  foo: T;
}

type Unbox<T> = T extends Box<infer V> ? V : never;
```

As a more extended example (summarized from the Gist above):

```js
interface BoxA<T> {
    a: T;
}

interface BoxB<T> {
    b: T;
}

function boxA<T>(a: T): BoxA<T> {
  return { a };
}

function boxB<T>(b: T): BoxB<T> {
  return { b };
}

// This is mildly annoying because
// we're basically repeating most of ReturnType<T>.
type RewrappedGetter<T> =
  T[K] extends (...args: any[]) => any
  ? (() => BoxB<UnboxA<ReturnType<T[K]>>>)
  : never
  ;

type RewrappedGetters<T> = {
  [K in keyof T]: RewrappedGetter<T>;
}

// Use of that type.
function rewrappifyGetters<T>(gs: T): RewrappedGetters<T> {
    const rwgs = {} as RewrappedGetters<T>;
    Object.keys(gs).forEach((key) => {
        rwgs[key] = () => boxB(gs[key]());
    });
    return rwgs;
}

// Example base item. (could have just used pwgs above, but eh.)
const wrappedGetters = {
    foo: () => boxA('foo'),
    bar: () => boxA(5),
};

// Rewrapped.
const rewrappedGetters = rewrappifyGetters(wrappedGetters);

// :: () => BoxA<string>
wrappedGetters.foo;
// :: () => BoxB<string> awww yiss
rewrappedGetters.foo;
```

Now we can rebox anything!  Just like chopsticks.
