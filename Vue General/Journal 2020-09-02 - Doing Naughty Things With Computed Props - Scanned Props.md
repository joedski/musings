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
