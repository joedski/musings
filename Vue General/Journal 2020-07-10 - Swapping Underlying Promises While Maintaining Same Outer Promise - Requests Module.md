Journal 2020-07-10 - Swapping Underlying Promises While Maintaining Same Outer Promise - Requests Module
========

One thing that hasn't yet come up, but which could for certain rapid-fire things such as person lookups or entity validation checks, is the ability to dispatch a new request before the old one finishes.  Technically that either cannot be done, or results in things awaiting on the old request now dealing with a different promise than those awaiting on a new request.  Meaning, not everything in the UI will have the same timing.  This is less deterministic than before!

What I really want, _or what I think I want anyway_, is to have one promise that is returned for any awaiting, and have the underlying promise that's around the actual request be only-internal.  Then, when ever a new internal-promise comes in we just swap em.

This should be simple to do, I think: just check upon resolution of the internal promise if the state's current internal promise is the same as the just-now-resolved internal promise.  If they are, then the state updates occur, including resolving the deferred; if not, then nothing happens.

Not as good as actually canceling, but that could be added in as well at some point.



## Quick Sketch

All it does is setup the instance as a Deferred with a bit of extra own-state and a `#swapInnerPromise` method.

```js
class SwappablePromise {
  constructor(initPromise) {
    this.isSettled = false;
    this.innerPromise = initPromise;
    // This is just the Deferred pattern.
    this.promise = new Promise(this.executor.bind(this));

    if (this.innerPromise != null) {
      this.handleInnerPromiseSettle();
    }
  }

  swapInnerPromise(nextPromise) {
    if (this.isSettled) {
      throw new Error('Cannot swap inner promise of settled SwappablePromise');
    }

    this.innerPromise = nextPromise;
    this.handleInnerPromiseSettle();
  }

  /** @private */
  executor(resolve, reject) {
    this.resolveOuterPromise = resolve;
    this.rejectOuterPromise = reject;
  }

  /** @private */
  handleInnerPromiseSettle() {
    this.innerPromise.then(
      this.handleInnerPromiseResolve.bind(this, this.innerPromise),
      this.handleInnerPromiseReject.bind(this, this.innerPromise)
    );
  }

  /** @private */
  handleInnerPromiseResolve(promise, resolution) {
    if (promise !== this.innerPromise) {
      return;
    }

    this.isSettled = true;
    this.resolveOuterPromise(resolution);
  }

  /** @private */
  handleInnerPromiseReject(promise, reason) {
    if (promise !== this.innerPromise) {
      return;
    }

    this.isSettled = true;
    this.rejectOuterPromise(reason);
  }
}
```
