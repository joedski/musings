Journal 2020-09-02 - Doing Naughty Things With Computed Props - Scanned Props
========

In an endeavor to get the most coveted of things from the Composition API, well the other most coveted of things anyway, into Computed Props, here's a naughty naughty thing with Computed Props.

Basis:

- Computed props' computing functions are of course executing with the component instance as the This-Arg of the function.
- We can use a WeakMap to create instance-specific caches.
- We can therefore generalize behavior with a global function while maintaining instance-specific state.

Let's use this to create a simple scanned prop.

Before we get fancy, let's just implement it [once-off, without an eye towards being instantiable multiple times](./Journal%202020-09-02%20-%20Doing%20Naughty%20Things%20With%20Computed%20Props%20-%20Scanned%20Props%20%28Files%29/00-ungeneralized.js).  Note that `lastAcc` is defined only once is the application life time here, and that using this component multiple times, whether simultaneously or serially, will cause undefined behavior.

```js
const FooComp = Vue.extend({
  props: {
    // nulls are naughty too, but whatever.
    foo: { type: String, default: null },
  },

  computed: {
    fooFoo: (() => {
      function iteratee(acc, next) {
        return [next, acc[0]];
      }

      let lastAcc = [null, null];

      return function fooFoo() {
        const nextAcc = iteratee(lastAcc, this.foo);
        lastAcc = nextAcc;
        return nextAcc;
      };
    })(),
  },

  // ...
});
```

```
------------
after mount:
  root.foo = "First"
  root.fooFoo = ["First",null]
------------
after foo=Second:
  root.foo = "Second"
  root.fooFoo = ["Second","First"]
------------
after foo=Third:
  root.foo = "Third"
  root.fooFoo = ["Third","Second"]
------------
all fooChanges: [
  {
    "name": "foo",
    "value": "First"
  },
  {
    "name": "fooFoo",
    "value": [
      "First",
      null
    ]
  },
  {
    "name": "foo",
    "value": "Second"
  },
  {
    "name": "fooFoo",
    "value": [
      "Second",
      "First"
    ]
  },
  {
    "name": "foo",
    "value": "Third"
  },
  {
    "name": "fooFoo",
    "value": [
      "Third",
      "Second"
    ]
  }
]
```

Alright, so that seems to work well enough.  Let's lift that out into [a form whose `lastAcc` is keyed by instance in memory](./Journal%202020-09-02%20-%20Doing%20Naughty%20Things%20With%20Computed%20Props%20-%20Scanned%20Props%20%28Files%29/01-generalized):

```js
const get = require('lodash/get');
const Vue = require('vue');

const scannedPropCache = new WeakMap();

function getSource(vm, source) {
  if (typeof source === 'string') {
    return get(vm, source);
  }

  if (typeof source === 'function') {
    // support both `this.foo` and `vm => vm.foo` forms.
    return source.call(vm, vm);
  }

  throw new Error(`Cannot get value from VM using unknown source: ${source}`);
}

function scannedProp(source, iteratee, init) {
  return function computeScannedProp() {
    const next = getSource(this, source);
    const hasLastState = scannedPropCache.has(this);
    let nextState;

    if (!hasLastState) {
      nextState = init(next);
    }
    else {
      const lastState = scannedPropCache.get(this);
      nextState = iteratee(lastState, next);
    }

    scannedPropCache.set(this, nextState);
    return nextState;
  }
}

const FooComp = Vue.extend({
  // ...

  data() {
    return {
      // nulls are naughty too, but whatever.
      foo: 'First',
    };
  },

  computed: {
    fooFoo: scannedProp(
      vm => vm.foo,
      (acc, next) => [next, acc[0]],
      (first) => [first, null]
    ),
  },

  // ...
});
```

That does work, but the init function is being used to basically compute the first iteration.  To be more technically correct, [we should not do that](./Journal%202020-09-02%20-%20Doing%20Naughty%20Things%20With%20Computed%20Props%20-%20Scanned%20Props%20%28Files%29/02-generalized-maybe-better-init.js):

```js
const get = require('lodash/get');
const Vue = require('vue');

const scannedPropCache = new WeakMap();

function getSource(vm, source) {
  if (typeof source === 'string') {
    return get(vm, source);
  }

  if (typeof source === 'function') {
    // support both `this.foo` and `vm => vm.foo` forms.
    return source.call(vm, vm);
  }

  throw new Error(`Cannot get value from VM using unknown source: ${source}`);
}

function scannedProp(source, iteratee, init) {
  return function computeScannedProp() {
    const next = getSource(this, source);
    const hasLastState = scannedPropCache.has(this);
    const lastState = hasLastState
      ? scannedPropCache.get(this)
      : init();
    const nextState = iteratee(lastState, next);

    scannedPropCache.set(this, nextState);
    return nextState;
  }
}

const FooComp = Vue.extend({
  // ...

  data() {
    return {
      // nulls are naughty too, but whatever.
      foo: 'First',
    };
  },

  computed: {
    fooFoo: scannedProp(
      vm => vm.foo,
      (acc, next) => [next, acc[0]],
      () => [null, null]
    ),
  },

  // ...
});
```

Hm.  That's getting better, but we could do better still, I think.

ES6 has a notion of default parameter values, which are values (actually expressions evaluating to values) which are used as the parameter's value if that parameter is passed the value `undefined`.  That sounds like an `init` value to me!  In fact, that exact notion is used in Redux, so it must be good, right?

And, on top of that, if we have access to the component instance (via `this`), we don't need to explicitly state what the source values are, we can just return a new state value and Vue will pick up all the dependencies during computation.

If we combine those two notions, we get [something very succint indeed](./Journal%202020-09-02%20-%20Doing%20Naughty%20Things%20With%20Computed%20Props%20-%20Scanned%20Props%20%28Files%29/03-using-default-arg-as-init.js):

```js
const Vue = require('vue');

const scannedPropCache = new WeakMap();

function scannedProp(iteratee) {
  return function computeScannedProp() {
    // Will be undefined on first run.
    const lastState = scannedPropCache.get(this);
    // We also pass the VM as the last argument
    // if arrow functions are more your fancy.
    const nextState = iteratee.call(this, lastState, this);

    scannedPropCache.set(this, nextState);
    return nextState;
  }
}

const FooComp = Vue.extend({
  // ...

  data() {
    return {
      // nulls are naughty too, but whatever.
      foo: 'First',
    };
  },

  computed: {
    fooFoo: scannedProp(
      function fooFoo(acc = [null, null]) {
        return [this.foo, acc[0]];
      }
    ),
  },

  // ...
});
```



## Global Cache Fun: Spot The Issue!

So, that's looking pretty good, [just one itty bitty little problem](./Journal%202020-09-02%20-%20Doing%20Naughty%20Things%20With%20Computed%20Props%20-%20Scanned%20Props%20%28Files%29/04-oh-no.js):

```js
const FooComp = Vue.extend({
  // ...

  data() {
    return {
      // nulls are naughty too, but whatever.
      foo: 'First',
    };
  },

  computed: {
    fooFoo: scannedProp(
      function fooFoo(acc = [null, null]) {
        return [this.foo, acc[0]];
      }
    ),
    fooFooObject: scannedProp(
      function fooFooObject(acc = { next: null, prev: null }) {
        return { next: this.foo, prev: acc.next };
      }
    ),
  },

  // ...
});
```

```
------------
after mount:
  root.foo = "First"
  root.fooFooLower = ["first",null]
  root.fooFooUpper = ["FIRST","first"]
------------
after foo=Second:
  root.foo = "Second"
  root.fooFooLower = ["second","FIRST"]
  root.fooFooUpper = ["SECOND","second"]
------------
after foo=Third:
  root.foo = "Third"
  root.fooFooLower = ["third","SECOND"]
  root.fooFooUpper = ["THIRD","third"]

...
```

Whups.  In all my excitement to get this working, I forgot that there are actually 2 (two) dimensions to take into account here: the VM Instance and the Iteratee.  Because of this, using two scanned props would result in them stomping on each others' states!

Fortunately, now that we know what's going on, [this is easy to fix](./Journal%202020-09-02%20-%20Doing%20Naughty%20Things%20With%20Computed%20Props%20-%20Scanned%20Props%20%28Files%29/05-key-on-inst-and-iteratee.js):

```js
class WeakMap2D {
  constructor() {
    this.root = new WeakMap();
  }

  get(a, b) {
    const aCache = this.root.get(a);
    if (aCache == null) {
      return aCache;
    }
    return aCache.get(b);
  }

  set(a, b, value) {
    if (!this.root.has(a)) {
      this.root.set(a, new WeakMap());
    }

    return this.root.get(a).set(b, value);
  }
}

const scannedPropCache = new WeakMap2D();

function scannedProp(iteratee) {
  return function computeScannedProp() {
    // Will be undefined on first run.
    const lastState = scannedPropCache.get(iteratee, this);
    // We also pass the VM as the last argument
    // if arrow functions are more your fancy.
    const nextState = iteratee.call(this, lastState, this);

    scannedPropCache.set(iteratee, this, nextState);
    return nextState;
  }
}

const FooComp = Vue.extend({
  // ...

  data() {
    return {
      // nulls are naughty too, but whatever.
      foo: 'First',
    };
  },

  computed: {
    fooFooLower: scannedProp(
      function fooFooLower(acc = [null, null]) {
        return [this.foo.toLowerCase(), acc[0]];
      }
    ),
    fooFooUpper: scannedProp(
      function fooFooUpper(acc = [null, null]) {
        return [this.foo.toUpperCase(), acc[0]];
      }
    ),
  },

  // ...
});
```



## What Can You Do With Scan?  ~~Take Over The World!~~ Nearly Anything!

You can do a great many things once you introduce statefulness!  One simple example is creating a filter to keep only prop values that you want:

```js
function filteredProp(getValue, predicate) {
  return scannedProp(function keepLastPassing(last) {
    const next = getValue.call(this, this);
    if (predicate.call(this, next, this)) {
      return next;
    }
    return last;
  });
}

const FooComp = Vue.extend({
  // ...

  data() {
    return {
      // nulls are naughty too, but whatever.
      foo: 'First',
    };
  },

  computed: {
    lastLongFoo: filteredProp(
      function getFoo() { return this.foo },
      function isFooLong(foo) { return foo.lenth > 5 }
    ),
    lastLongFooWithArrows: filteredProp(
      vm => vm.foo,
      foo => foo.lenth > 5
    ),
  },

  // ...
});
```

As a caution, this is strictly in keeping with the notion of filtering out _all_ values that do not pass the predicate, including the first one!  This means the computed value of `lastLongfoo` could be `undefined`!

If we want instead to only start skipping values once we have a valid value, we'll need to change the logic a bit:

```js
function latchingProp(getValue, predicate) {
  function boundGetValue(vm) {
    return getValue.call(vm, vm);
  }

  function boundPredicate(vm, value) {
    return predicate.call(vm, value, vm);
  }

  return scannedProp(function latchToLastProp(last) {
    const next = boundGetValue(this);

    if (boundPredicate(this, next) || last === undefined) {
      return next;
    }

    if (boundPredicate(this, last)) {
      return last;
    }

    return next;
  });
}
```

Not that different, but different enough.



## Naughty Naughty: Computed Props And Watches Treat Object Values As Always Different

Here's where we run afoul of an edge case while playing outside of the defined behavior of Vue Computed Props: Computed Props seem to treat Object (non-Primitive) return values as always changing, which given that Vue deals with a mutation based reactivity system is a pretty reasonable assumption.

This results in bad behavior for us, though: because Object return values are always treated as changing, and therefore Vue treats the Computed Prop Value as changing for the purpose of depnedency tracking, any Watches on a Computed Prop will also be twigged.

Here's [an example close to one use case](./Journal%202020-09-02%20-%20Doing%20Naughty%20Things%20With%20Computed%20Props%20-%20Scanned%20Props%20%28Files%29/06-spurious-object-updates.js):

```js
const INITIAL_STATE = { value: { name: 'Nothing!' } };

const FooComp = Vue.extend({
  // ...

  data() {
    return {
      stateMap: {},
    };
  },

  computed: {
    fooStateValue() {
      const { foo } = this.stateMap;
      // INITIAL_STATE is a constant, so it should
      // always equal itself by identity.
      if (foo == null) return INITIAL_STATE.value;
      return foo.value;
    },
    lastFiveFoos: scannedProp(
      function lastFiveFoos(acc = []) {
        const next = [this.fooStateValue, ...acc];
        return next.slice(0, 5);
      }
    ),
  },

  watch: {
    fooStateValue: {
      immediate: true,
      handler(next) {
        this.onValueChange('fooStateValue', next);
      },
    },
    lastFiveFoos: {
      immediate: true,
      handler(next) {
        this.onValueChange('lastFiveFoos', next);
      }
    },
  },

  // ...
});
```

The issue arises here when changes are made directly to `this.stateMap`, by definining new properties or deleting existing ones:

```js
// Note: Not 'foo'!
Vue.set(root.stateMap, 'bar', { name: 'Bar!' });
```

We might expect naively that `lastFiveFoos` is only updated once and so only contains 1 value, but in truth we see a new value every time `Vue.set()` is used:

```
------------
after mount:
  root.fooStateValue = {"name":"Nothing!"}
  root.lastFiveFoos = [{"name":"Nothing!"}]
------------
after set(stateMap, bar, Bar!):
  root.fooStateValue = {"name":"Nothing!"}
  root.lastFiveFoos = [{"name":"Nothing!"},{"name":"Nothing!"}]
------------
after set(stateMap, baz, Baz?):
  root.fooStateValue = {"name":"Nothing!"}
  root.lastFiveFoos = [{"name":"Nothing!"},{"name":"Nothing!"},{"name":"Nothing!"}]
```

This makes sense, as `stateMap` itself is accessed, and is also itself mutated.  Vue has no knowledge beforehand that we're actually interested in only `stateMap.foo`, because `.foo` isn't defined yet.

When combined with the above mentioned edge case of objects seeming to be treated as always changing due to Vue being mutation-centric, all this results in the above behavior.

> As an aside, [even using a pre-defined initial state doesn't help](./Journal%202020-09-02%20-%20Doing%20Naughty%20Things%20With%20Computed%20Props%20-%20Scanned%20Props%20%28Files%29/07-predefined-initial-state.js).

The way we could get around this is to use a simple `if (next === prev) return acc` type deal, but that won't really help if used in a computed prop: it'd have to be added to every single computer function.

The only real way to handle such changes is by doing such a check in a `watch` and using that condition to update observable state.

Component wise, this would look something like:

```js
const INITIAL_VALUE = { value: 'Initial' };

const FooComp = Vue.extend({
  // ...

  data() {
    return {
      stateMap: {},
      fooLastChanged: INITIAL_VALUE,
    };
  },

  computed: {
    foo() {
      const { foo } = this.stateMap;
      if (foo == null) return INITIAL_VALUE;
      return foo;
    },
  },

  watch: {
    foo: {
      immediate: true,
      handler(next, prev) {
        this.onValueChange('foo', next);
        // NOTE: this can be generalized by using a changed-predicate.
        if (next !== prev) {
          this.fooLastChanged = next;
        }
      },
    },
    fooLastChanged: {
      immediate: true,
      handler(next) {
        this.onValueChange('fooLastChanged', next);
      }
    }
  },
});
```

Looking at the changes, we can see that `fooLastChanged` no longer updates every single time `foo` does:

```
all foo changes: [
  // First time, a change from "foo" results in...
  {
    "name": "foo",
    "value": {
      "value": "Initial"
    }
  },
  // ... a change from "fooLastChanged".
  {
    "name": "fooLastChanged",
    "value": {
      "value": "Initial"
    }
  },
  // A second time, even though "foo" changes due to
  // "Vue.set(root.stateMap, 'bar', { value: 'Bar!' })"...
  {
    "name": "foo",
    "value": {
      "value": "Initial"
    }
  },
  // There's no corresponding change from "fooLastChanged".
  // Now if we change "foo" to something actually different
  // with "Vue.set(root.stateMap, 'foo', { value: 'second foo!' })"...
  {
    "name": "foo",
    "value": {
      "value": "second foo!"
    }
  },
  // ... We again get the expected change.
  {
    "name": "fooLastChanged",
    "value": {
      "value": "second foo!"
    }
  },
  // But a change elsewhere, though resulting in an apparent
  // change in "foo"...
  {
    "name": "foo",
    "value": {
      "value": "second foo!"
    }
  }
  // ... does not result in another watch-call from "fooLastChanged".
]
```

Could we use that to implement our computed prop?  Hm.



## A Thought: Watch And Observable

So, we already have access to the component instance and key off of it, and in the computed prop context we assume reactivity is already a given, so we should be able to just `$watch`.

This requires going a step below `scan` though, to deal with the state itself.

Hm.

We've got a few things going on.

- Computed Props are synchronous, they must always return a value now, not later.
- Watches are asynchronous, they are callbacks that are called when ever a Change is detected by Vue.
    - Specifically, when ever a change (by subscription) is detected, Vue _enqueues_ a handler callback to be handled _next tick_.
        - I usually call this "later", since we cannot deterministically rely on specific timing and order outside of that which we specifically define and coordinate.
- This means we must always get a value at least the first time, though subsequent times we can entirely ignore the getter as the Watch is handling that.
- Internal State wise, this means:
    - First, check Internal State: is it still initial?
        - If yes:
            - Use value getter to set Internal State.
            - Set (non-immediate) watch on value getter:
                - On change, use is-distinct predicate:
                    - If predicate passes: update Internal State.
                    - Otherwise: do nothing.
            - Return that value.
        - Otherwise:
            - Return value in state.

Maybe something like this, then?

```js
const keepDistinctByCache = new WeakMap2D();

function keepDistinctBy(
  getValue,
  isDistinct
) {
  return function keepDistinctByProp() {
    const state = keepDistinctByCache.get(this, keepDistinctByProp);

    if (state == null) {
      const initialValue = getValue.call(this);
      const initialState = Vue.observable({
        // Value is wrapped in a function to prevent unexpected reactification.
        value: () => initialValue,
      });

      keepDistinctByCache.set(this, keepDistinctByProp, initialState);

      this.$watch(getValue, (next, prev) => {
        if (isDistinct(next, prev)) {
          const state = keepDistinctByCache.get(this, keepDistinctByProp);
          state.value = () => next;
        }
      });

      return initialState.value();
    }

    return state.value();
  };
}
```

What's expected to happen here based on what we know?

1. Source Value has an initial value.
2. Denpendent of Computed Prop is evaluated, Computed Prop is accessed.
3. Computed Prop is evaluated first time, goes through `state == null` branch.
    1. Source Value is gotten.
        1. Reactivity Dependencies Registered: Source Value.
    2. Initial state is created with Source Value as initial value.
    3. Watch on Source Value is created.
    4. Initial value is returned from Initial State.
        1. Reactivity Dependencies Registered: State value.
    5. Computed Prop is now initially computed and has following Reactivity Dependencies:
        1. Source Value.
        2. State Value.
4. Dependencies of Computed Prop finish evaluation.
5. Source value changes.
    1. Computed Value Recomputation is enqueued.
    2. Watch on Source Value is enqueued.
6. The following happen in a random order:
    - Computed Prop Value Recomputation:
        1. State Value is returned.
            1. Reactivity Dependencies Registered: State value.
            2. Dependent updates enqueued.
    - Watch on Source Value 
        1. State Value is updated.
            1. Computed Value Recomputation is enqueued.
    - Updates to dependents of Computed Prop evaluated.
    - Computed Prop Value Recomputation (if watch handling occurred after first recomputation):
        1. State Value is returned.
            1. Reactivity Dependencies Registered: State value.
            2. Dependent updates enqueued.
    - Updates to dependents of Computed Prop evaluated.

Note that the exact queue of items is different depending on whether the watch is handled first or if the computed prop recomputation is handled first.  While it does eventually settle out, the effects are still not what we'd like, as it's undetermined from current information whether or not we'd get multiple updates or not from the first change to Source Value.

In either case, we still have an undesirable subscription to the Source Value from the Computed Prop itself rather than from the Watch, which results in at least 1 recomputation that is immediately updated due to a change from Source Value rather than only from the internal State Value.

Indeed, doing a [practical test with Vue 2.6](./Journal%202020-09-02%20-%20Doing%20Naughty%20Things%20With%20Computed%20Props%20-%20Scanned%20Props%20%28Files%29/09-watch-with-observable.js), we get just that: 

```
all foo changes: [
  // This is expected.
  "() => initAndMount()",
  {
    "name": "foo",
    "value": {
      "value": "Initial"
    }
  },
  {
    "name": "fooDistinct",
    "value": {
      "value": "Initial"
    }
  },
  {
    "name": "derivedFromfoo",
    "value": {
      "stringified": "{\"value\":\"Initial\"}"
    }
  },
  // Here, however, we would expect that "fooDistinct" at least
  // is not affected, but we can see here that it is.
  "() => Vue.set(root.stateMap, 'bar', { value: 'Bar!' })",
  {
    "name": "foo",
    "value": {
      "value": "Initial"
    }
  },
  {
    "name": "fooDistinct",
    "value": {
      "value": "Initial"
    }
  },
  {
    "name": "derivedFromfoo",
    "value": {
      "stringified": "{\"value\":\"Initial\"}"
    }
  },
  // After that second update however, things operate as we expect.
  "() => Vue.set(root.stateMap, 'zap', { value: 'Zap Zap Zap!' })",
  {
    "name": "foo",
    "value": {
      "value": "Initial"
    }
  },
  // Updates to "foo" operate as expected.
  "() => Vue.set(root.stateMap, 'foo', { value: 'second foo!' })",
  {
    "name": "foo",
    "value": {
      "value": "second foo!"
    }
  },
  {
    "name": "fooDistinct",
    "value": {
      "value": "second foo!"
    }
  },
  {
    "name": "derivedFromfoo",
    "value": {
      "stringified": "{\"value\":\"second foo!\"}"
    }
  },
  // As do non-updates, of course.
  "() => Vue.set(root.stateMap, 'bazinga', { value: 'Bazinga!' })",
  {
    "name": "foo",
    "value": {
      "value": "second foo!"
    }
  }
]
```



## Another Tack: Direct Mutation In Computed Prop?

What if we got even naughtier and, instead of or in addition to registering a Watch, we had a computed prop on the observable and had that directly mutate some state...?  Hm.
