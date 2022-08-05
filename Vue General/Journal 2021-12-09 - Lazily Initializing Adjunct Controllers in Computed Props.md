Journal 2021-12-09 - Lazily Initializing Adjunct Controllers in Computed Props
==============================================================================

Basically, only setup reactive state when another reactive dependency first needs to poll it.



Sketch 1
--------


### Sketch 1.1: Scan

Simple enough: since we're in a computed prop the value being returned isn't converted into a reactive object, so we can just add a property after the fact.

```js
const UNSET = {};

class Scan {

    constructor(
        getInitialValue,
        scan
    ) {
        this._last = UNSET;
        this._getState = null;
        this._getInitialValue = getInitialValue;
        this._scan = scan;
    }

    get value() {
        if (this._last === UNSET) {
            this._last = () => this._getInitialValue()
            this._getState = Vue.observable({
                // last: this._last,
                observed: () => {
                    // pulls deps through getInitialValue() the first time.
                    const last = this._last();
                    // pulls deps through scan()
                    const next = this._scan(last);

                    this._last = () => next;

                    return next;
                }
            });
        }

        return this._getState.observed;
    }

}
```

As a strict scan, this works, but we don't have the ability to filter changes.  That should probably be a separate thing.


### Sketch 1.2: Filter/Keep

The process of filtering in Vue is a bit tricky:

1. We need to watch for updates from something.
    1. But we do _not_ want to watch our own state, as that would be terrible!
2. We need to _maybe_ update another state value.
3. So that future parts of the chain can watch that state value.

One thing we can do is take note of the fact that watch handlers aren't themselves called until the next tick, and just follow that same behavior ourselves.

```js
const UNSET = {};

class Filter {

    constructor(
        value,
        shouldUpdate
    ) {
        this._value = value;
        this._shouldUpdate = shouldUpdate;
        this._getState = null;
        this._last = () => UNSET;
        // ...
    }

    get value() {
        if (this._getState == null) {
            this._getState = Vue.observable({
                last: null,
                observed: () => {
                    // Setup reactive dependencies.
                    const next = this._value();
                    const getLast = this._last;

                    Vue.nextTick(() => {
                        // Skip in case of multiple quick updates stacking up checks.
                        if (this._last !== getLast) return;

                        const maybeLast = getLast();
                        const last = maybeLast === UNSET ? undefined : maybeLast;

                        if (this._shouldUpdate(next, last)) {
                            this._last = () => next;
                            this._getState.last = this._last;
                        }
                    });

                    return next;
                }
            });
        }

        if (this._getState.last == null) {
            return undefined;
        }

        return this._getState.last();
    }
}
```

Hm.  A laudable first try, but doesn't feel quite right.

1. For one thing, it starts out undefined which is ... technically true, but will lead to a great many user errors I think.
    1. Though, to be fair, I'm not sure we can outright assume either case is the only valid one.  Sometimes you may want to have `undefined` be the initial value, and other times you may want the first watched value to be the initial value and to only filter on changes.
    2. Basically, the `initial: true/false` behavior of `watch`.

Ah, the joys of performing side effects in computed props.


### Sketch 1.3: General Stream Creator

This does make me wonder though: maybe what we need is not Scan and Filter as a start, but something a bit lower level?  Something where you call a `next()` or `push()` callback to push the next value.

That could even be explicitly made to allow time-based operations, like `delay` or `throttle/debounce`, or possibly even push several values across time like with requests or tickers?

Hm!

```js
class Reaction {
    constructor(step) {
        this._step = step;
        this._getState = null;
        this._value = () => undefined;
    }

    get value() {
        if (this._getState == null) {
            const watch = () => {
                const scheduleUpdate = (nextValue) => {
                    this._getState.value = this._value = () => nextValue;
                };

                // The step function is what registers all the dependencies.
                this._step(this._value(), nextValue);
            };

            this._getState = Vue.observable({
                value: () => undefined,
                get observed() {
                    return watch();
                },
            });

            return this._getState.observed;
        }

        return this._getState.value();
    }
}
```


### Stepping Back a Moment

What are we trying to do, anyway?

1. A updates.
2. Reaction watches A, runs its step function, which maybe-updates its state.
3. Reaction state update propagates to B.

But what about the starting conditions?

I guess that depends on if we're trying to implement Streams or Behaviors.

- a Stream technically doesn't have a "current value", nor even a "last value".  Rather, 0-time-span events flow through Streams, possibly being transformed or causing emission of yet more events across time, etc.
- a Behavior _always_ has a defined value across all time (that the behavior itself lives), though that value isn't necessarily smooth/continuous.

So what are we trying to do here?

- For rendering, we want a Behavior because rendering always needs a defined value.
- The primary purpose is to transform values for rendering.
- Ergo, we want a Behavior, or something close enough to that.
- Ergo, we always want a defined value.

Okay, so how's that affect said starting conditions?

- We must have a defined value initially, no `undefined` shenanigans here.
- That means we have 2 choices:
    1. Initialize to some value explicitly.
        1. Nice because we don't have to worry about an initial computation, we always get the initial value.
    2. Evaluate (pull) the initial value via the computation.
        1. Nice because we don't have a separate initial value.
        2. Not nice because the whole "initial computation" thing still exists in our computation.
        3. Theoretically doesn't matter if we derive only from other Behavior-like sources, but does if we derive from Stream-like sources.

The above considerations are why strict FRP things distinguish between Behaviors and Streams.

Given the above, maybe we have...

- Changed :: Behavior -> Stream
- Scan :: foldFn -> Behavior -> Behavior
- Filter :: predicateFn -> Stream -> Stream

Though, how seriously we keep to that is another question since JS isn't strictly typed and Vue isn't FRP.  In fact, this may be more about diving into the ideas of FRP to create a tool or tool set that is still wholly Vue centric, barrowing notions to build something still useful.

This is also largely unnecessary given the Composition API but anyway.

While that separation above is useful notionally, what about the bare tooling to implement it?


### Stepping Forward Again (After a Shower)

Had a shower thought: dance with side effects internally to build pure(ish) tools atop them, starting with a bare "watch" or "computed" thing.  This is kind of how Flyd or Mithril streams start.  Maybe we'll say `Reaction.of(() => someDerivation())` and start from there?

I know I started with FRP in mind, but this is starting to look more like S+.  I hope it doesn't create any memory leaks...

I think at a bare minimum we'll need something like...

```js
// React to changes in the "user" param...
Reaction.of(() => this.$route.params.user);

// ... by folding over it
Reaction.of(() => this.$route.params.user)
    .fold((state = [], next) => [next, ...state].slice(0, 2));

// ... by flat-folding over it asynchronously
Reaction.of(() => this.$route.params.user)
    .do((push, state, next) => {
        // We cannot ask if we have nothing to ask!
        if (!next) {
            // We do this because push() will always emit an update, even if
            // the same value is pushed.  This is similar to how Vue deals with
            // deep updates in object values, by assuming if an update was tagged
            // but an object returned then a deep change occurred.  Efficient,
            // if not always correct.
            if (state !== AsyncData.NotAsked()) {
                push(AsyncData.NotAsked());
            }

            return;
        }

        push(AsyncData.Waiting());

        Axios(getUserInfo({ userId: next })).then(
            response => push(AsyncData.Data(response)),
            error => push(Asyncdata.Error(error))
        );
    });

// Filter can be defined as...
Reaction.of(() => this.$route.params.user)
    .fold((state = [], next) => [next, ...state].slice(0, 2))
    .filter((next, prev) => next.every((el, i) => el === prev[i]))
    ;

// Only change if any given pair of values varies above some amount.
// That is, emit only large changes, but ignore small changes, regardless of
// the underlying value's magnitude.
Reaction.of(() => this.state.someValue)
    .fold((state = [], next) => [next, ...state].slice(0, 2))
    .map((history) =>
        history.length > 1
            ? Math.abs(history[1] - history[0])
            : 0
    )
    .filter((next) => next.difference >= 2)
    ;
```

All but one of these can have some sort of synchronous initial value defined, and the exception is `Reaction#do()`.

Granted, we could actually allow it to by adding some extra special behavior: we could say that every time `push()` is called, if no updated was flushed this tick then it's synchronously flushed and otherwise it's enqueued for asynchronous flushing by Vue next tick.

Given Vue's mainly value-driven behavior, that might be better.

That means `do()` pulls double duty as both `flatMap()` and `tap()`, which is fine.

It also means `fold` is a special case of `do`, which is nice.

```js
const DEFAULT_PROCESS = (push, state, next) => push(next);

class Reaction {
    static of(watch) {
        return new Reaction(watch);
    }

    constructor(watch, process = DEFAULT_PROCESS) {
        if (watch instanceof Reaction) {
            this._priorReaction = watch;
            this._watch = () => watch.value;
        } else {
            this._priorReaction = null;
            this._watch = watch;
        }

        this._observable = null;
        this._process = process;
        this._getState = () => undefined;
        this._laggingQueue = [];
        this._pending = null;
    }

    do(process) {
        return new Reaction(() => this.value, process);
    }

    map(transform) {
        return this.do((push, state, next) => {
            push(transform(next));
        });
    }

    fold(accumulator) {
        return this.do((push, state, next) => {
            push(accumulator(state, next));
        });
    }

    filter(predicate) {
        return this.do((push, state, next) => {
            if (predicate(next, state)) {
                push(next);
            }
        });
    }

    default(getDefault) {
        return this.do((push, state, next) => {
            if (next === undefined) {
                return getDefault();
            }

            return next;
        });
    }

    apply(app) {
        app(this);

        return this;
    }

    get value() {
        if (this._observable == null) {
            const watchHandler = () => {
                // Reactive dependencies.
                const next = this._watch();

                this._process(
                    (next) => this._push(next),
                    this._getState(),
                    next
                );

                if (this._getState() == null) {
                    return undefined;
                }

                return () => this._observable.getState();
            };

            this._observable = Vue.observable({
                get watch() {
                    return watchHandler()
                },
                getState: this._getState,
            });
        }

        return this._observable.watch();
    }

    _setState(getNext) {
        this._getState = getNext;
        this._observable.getState = this._getState;
    }

    _push(next) {
        const getNext = () => next;

        this._laggingQueue.push(getNext);

        if (this._laggingQueue.length === 1) {
            this._setState(getNext);
        }

        if (this._pending == null) {
            this._pending = Vue.nextTick().then(() => this._shiftPendingAndCheck());
        }
    }

    _shiftPendingAndCheck() {
        this._laggingQueue.shift();
        this._pending = null;

        if (this._laggingQueue.length >= 1) {
            const getNext = this._laggingQueue[0];
            this._setState(getNext);
            this._pending = Vue.nextTick().then(() => this._shiftPendingAndCheck());
        }
    }
}
```

A laudable if still extremely questionable first try, but suffers from a circular dependency, probably a self dependency: it works fine the first calculation, but after that it gets stuck in an infinite loop.

What would we like to happen in each case?

1. Initial Poll
    1. Read source values
    2. Synchronously apply process and synchronously push state if state is synchronously pushed in process
    3. Return state
2. Subscription Update
    1. Watch is evaluated
    2. Apply process to updated value
    3. Asynchronously push state
    4. Subsequent subscriptions are asynchronously updated

We could try piling yet another hack atop of a pile of hacks by only synchronously updating the very first time, then only updating asynchronously thereafter.

Given that, we'll at least need to track if we've done that initial synchronous update, so something like `this._hasFlushedInitialUpdate` or something obnoxious.
