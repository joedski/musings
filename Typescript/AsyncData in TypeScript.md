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


### Run-Time Type Checking

Neither implementation includes the ability to check types separately and, for the use cases I'm considering, I don't think that's really necessary.  Every case is better handled with `inst.cata()`.  (Except those better handled with `.map()` because you only need to change the success case.)

On the other hand, if I just attached the class constructors directly to `AsyncData`, then I could just define `is` on them directly, or users could just use `instanceof` to check if the types are as described.


### The Component Enhancer

There's also the fact that for the actual enhancer itself, I'll need to be able to determine the types of the re-wrapped functions...  Fortunately, I've since learned [how to unbox types for reboxing](./Unboxing%20Types%20From%20Parametrized%20Boxes.md), so that's that part under my belt.

Given the need to add extra props based on inputs, it may be informative to see [how React-Redux defines their types](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/react-redux/index.d.ts#L75), along with [how they specify the polymorphic interface of their enhancer](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/react-redux/index.d.ts#L109).  It's a bit hairy.


### Aside: Multiple Results, One Prop Name

I noted somewhere else that if a getter fetch in this pattern can be parametrized on something, then simultaneous fetch calls will conflict.  The basic solution is to, in such cases, create a collection of item-results based on one of the parameters or the return value.  I think the easiest way to do that would be to expose the ability to specify the new-value-reduce behavior, the scanner function, basically.

For full flexibility, I think you'd need to be able to map things async, so you could say do `response.json()`, so return the new prop's value in a promise.  Or, hm.  That might cause issues if you have multiple things resolve simultaneously.  That'd require a two-step thing, I guess: async-map result and sync-reduce.  Then, it'd probably be easiest to just not allow async, and require async be done as part of the fetcher itself.

So, I guess the full interface would be:

```js
interface Reducer<T> {
  (prop: T, nextValue, argsArray): T;
}

interface FetcherGetter<> {
  (props) => Fetcher<>;
}

type FetcherDef<> =
  | FetcherGetter<>
  | {
    fetch: FetcherGetter<>;
    reduce: Reducer<>;
  }
```

Something like that.

The reducer would be called any time a status update occurs, so you can update based on that.  A common one might be:

```js
function r(prop, nextValue, argsArray) {
  return {
    ...prop,
    [argsArray[0]]: nextValue,
  };
}
```

In fact, probably the most common one would be that.

The Fetcher Getter is of course to allow the use of props, which includes use with React-Redux.

And, naturally for anything reduce-ish, we need an initial value.  This brings the full definition to:

```js
withAsyncData({
  foo: {
    // :: (props: Props) => (...args: Args) => Promise<V>
    getter: (props) => props.getFoo,
    // :: (prop: PropType<Def[K]>, nextValue: V, argsArray: Args) => PropType<Def[K]>
    reduce: (prop, nextValue, argsArray: Args) => ({
      ...prop,
      // Overwrite the previous value for the given sub-prop at argsArray[0].
      [argsArray[0]]: nextValue,
    }),
    // :: PropType<Def[K]>
    initialValue: {},
  }
})
```

It's probably fine to stipulate in the interface that if `reduce` is specified, `initialValue` is required, even if it's explicitly `undefined` or `null`.


### Use with React-Redux

Simplest solution:

```js
const connection = connect(...);
const addAsyncDataStatus = withAsyncDataStatus(...);

const EnhancedComponent = compose(
  // Define underlying fetches here so they can dispatch, etc.
  connection,
  // Wrap functions here to handle async-data-status.
  addAsyncDataStatus,
)(BaseComponent);
```
