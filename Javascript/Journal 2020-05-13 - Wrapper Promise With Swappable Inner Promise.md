Journal 2020-05-13 - Wrapper Promise With Swappable Inner Promise
========

Okay, this is an extremely niche thing, but basically...

- I want to implement a request interface behavior where:
    - Interface callers don't have to handle swapping out promises themselves.
    - Interface callers may force a re-request on an already in-flight request, replacing the old call with the new call.

One way I can think of to do this is:

- A Promise that is just a single promise to the outside world.
- However, that Promise will have an inner Promise that can be swapped out with another Promise as long as current inner Promise is not yet resolved or rejected.

Probably not all that difficult?

```js
class SwappablePromise extends Promise {
  constructor(initialPromise) {
    super(this.promiseExecutor.bind(this));
    this.currentPromise = initialPromise;
    this.settled = false;
  }

  promiseExecutor(resolve, reject) {
    // A dramatic decision.
    this.resolveSelf = resolve
    this.rejectSelf = reject
  }

  set promise(nextPromise) {
    if (this.settled) {
      console.error('Cannot swap promises if the last promise has already resolved or rejected');
      return;
    }

    this.currentPromise = nextPromise;

    nextPromise.then(
      value => this.conditionallyResolve(nextPromise, value),
      reason => this.conditionallyReject(nextPromise, reason)
    );
  }

  conditionallyResolve(promise, value) {
    if (promise !== this.currentPromise) return;

    if (this.settled) {
      console.error('Cannot resolve a promise that has already been resolved or rejected');
      return;
    }

    this.settled = true;
    this.resolveSelf(value);
  }

  conditionallyReject(promise, reason) {
    if (promise !== this.currentPromise) return;

    if (this.settled) {
      console.error('Cannot reject a promise that has already been resolved or rejected');
      return;
    }

    this.settled = true;
    this.rejectSelf(reason);
  }
}
```

That kind of exposes everything, though I don't usually care much about that.  A cleaner implementation with just functions and no icky `extends`:

```js
function swappablePromise(initialPromise) {
  let currentPromise = initialPromise;
  let isSettled = false;
  let resolveOuter;
  let rejectOuter;

  function conditionallyAct(promise, value, action) {
    if (promise !== currentPromise) return;

    if (isSettled) {
      console.error('Current promise resolved or rejected multiple times', promise, value, action);
      return;
    }

    action(value);
  }

  function setInnerPromise(nextPromise) {
    if (isSettled) {
      throw new Error('Cannot set innerPromise after the outer promise has already been resolved or rejected');
    }

    currentPromise = nextPromise;

    nextPromise.then(
      value => conditionallyAct(nextPromise, value, resolveOuter),
      reason => conditionallyAct(nextPromise, reason, rejectOuter)
    );
  }

  const outerPromise = new Promise((resolve, reject) => {
    resolveOuter = resolve;
    rejectOuter = reject;
  });

  return {
    setInnerPromise,
    promise: outerPromise,
  };
}
```

Decided to throw on calling `setInnerPromise` more than appropriate, on the basis that it's a logic error and so should be loud.  Also deduplicated the conditional behavior, though it loses the specificity of the error message.

Otherwise, it's the same thing.

Could use a Deferred, actually.
