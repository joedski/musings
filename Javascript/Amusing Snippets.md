Amusing Snippets of JS
======================

Silly (possibly) unusual things that I've discovered over the years.



## Create an Empty Array of Some Length

Creating an empty array of some defined length isn't as straight forward in JS as might be expected.  You can't just use `Array(n)`, even though that yields an array with length of `n`; it doesn't work with any of the methods like `map`, `forEach`, etc.

Rather, you need to "reify" the array by passing it through something that expects an Iterator, or uses an Array as an Iterator.  Alternatively, if you use `Function#apply` then that (seemingly) uses the length of the supplied arguments array to determine how to call the target function.

```js
// Array (rather, Iterable) spread
const arr = [...Array(100)];

// Argument spread
const arr = Array(...Array(10));

// Or, ES5 style
// Also useful in Typescript.
const arr = Array.apply(null, Array(10));

// This can also be done using a for-of loop.
for (const x of Array(10)) {
  // NOTE: x will be `undefined`.
  console.log("thing!");
}

// Very verbose way to do the first three statements.
function arrayWithLength(n) {
  const arr = [];
  for (const x of Array(10)) {
    // x is `undefined`.
    arr.push(x);
  }
  return arr;
}

// create a n->m range
function range(n, m) {
  return [...Array(m - n)].map((e, i) => i + n);
}
```


### Tangent: Spreading Iterables

Array and Argument Spread work with the Iterator interface, which means you can actually spread anything you want, as long as it defines an iterator interface.

```js
[...(new Map([[1, 'a'], [2, 'b'], [3, 'c']]))]
// -> [ [ 1, 'a' ], [ 2, 'b' ], [ 3, 'c' ] ]

function *foos() { yield 'foo'; yield 'Foo'; yield 'FOO'; }

[...foos()]
// -> [ 'foo', 'Foo', 'FOO' ]

console.log(...foos())
// logs: foo Foo FOO

var beep = {
    [Symbol.iterator]() {
        return [this.foo, this.bar, this.baz][Symbol.iterator]();
    },

    foo: 'Foo!',
    bar: 'Bar!',
    baz: 'Baz!',
};

[...beep];
```



## Very New Objects

I'm not sure what to do with this... probably avoiding it like the plague.

```js
class Foo extends Function {
  constructor(val) {
    super(`
      this.val = arguments[0];
    `);
    this.prototype.val = val;
  }
}

var foo = new new Foo(':D')('D:');
console.log(foo.val); // -> 'D:'
delete foo.val;
console.log(foo.val); // -> ':D'
```

Can we go... farther?  Without stack-overflowing, I mean.  Hm.

```js
Function.prototype.constructor === Function;
// -> true
```


### Even Newer Things

In all of my excitement about classes extending Function, I forgot the simplest solution: Return something else from the constructor.

I'm not sure if I agree with ever doing this in a practical case, and I mean, extending Function is already pretty terrible as it is, but since the `this` value being returned by default from the `new Fn()` expression can be overridden by explicitly returning something else from the Constructor...

```js
var VeryConstructable = class VeryConstructable {
  constructor(val) {
    // Use the same constructor here.
    class $VeryConstructable extends VeryConstructable {}

    // Create the updated value.
    // Note: det er ikke en dans.
    const lastVals = this.vals || [];
    $VeryConstructable.prototype.vals = [...lastVals, val];

    // Convenience static accessor.
    Object.defineProperty($VeryConstructable, 'vals', {
      get() {
        return $VeryConstructable.prototype.vals;
      },
    });

    // Madness.
    return $VeryConstructable;
  }
}

var vvvv = new new new new VeryConstructable('a')(3)({ wow: 'what a waste of time' })(['hey', 'ho', 'hey', 'ho']);

console.log(vvvv.vals);
```

Now you have the a running contender for Most Obnoxious Interface.


### Slight Update: Now With Static Getters!

Things have improved since the first version, with static methods now being supported in every browser.

```js
class VeryConstructable {
  // Make things more convenient for later.
  static get values() {
    return [];
  }

  constructor(value) {
    // We'll be nice and actually extend things all the way down.
    // Why?  Because it's not dumb enough.
    const Base = this.constructor;

    // Continue the chain!
    const prevValues = Base.values;

    // Madness.
    return class $VeryConstructable extends Base {
      static get values() {
        return [...prevValues, value];
      }

      constructor(nextValue) {
        return super(nextValue);
      }
    };
  }
}
```

If we really wanted to support dynamic updates of `values`, we could just directly reference `Base.values` in `static get values`.


### But Also Back to Non-Classy JS

Because I can't let well enough alone, here's a version without the `class` keyword.

```js
const VeryConstructable = (() => {
  function VeryConstructable(value) {
    const prevValues = this.constructor.values;

    function $VeryConstructable(nextValue) {
      return VeryConstructable.call(this, nextValue);
    }

    // Uncomment if you actually care about the prototype chain...
    // $Renewable.prototype = Object.create(Base.prototype);
    // $Renewable.prototype.constructor = $Renewable;

    Object.defineProperty($VeryConstructable, 'values', {
      get() {
        return [...prevValues, value];
      },
    });

    return $VeryConstructable;
  }

  Object.defineProperty($VeryConstructable, 'values', {
    get() {
      return [];
    },
  });

  return Renewable;
})();
```



## Asyncifying a Function

```js
function callAsync(syncFn) {
  return new Promise(r => r(syncFn()));
}

function asyncify(syncFn) {
  return (...args) => callAsync(() => syncFn(...args));
}

// Or if you want to carry `this` over...
function asyncify(syncFn) {
  return (...args) => callAsync(() => syncFn.apply(this, args));
}

// Alternatively...
function asyncify(syncFn) {
  return function asyncified(...args) {
    return callAsync(() => syncFn.apply(this, args));
  };
}
```

This works because throwing an error in the Promise Executor (the function you pass to the Promise Constructor) results in that Promise rejecting!  So you don't even need to write your own try/catch block in there, you can just eagerly call `resolve` and know that, should `syncFn` throw, the Promise will `reject` instead.



## Returnable If Statements: A Fun Use of IIFEs

`if/else` block sets are Flow-Control Statements in JS, which means that unlike in Coffeescript, Lisp, or various other languages, you can't use them to assign to a `const` declaration.  At least, not directly.

There is, however, something in JS that does allow you to assign to a `const` declaration, and that's an Immediately Invoked Function Expression, or IIFE.  Thus, you can now write complex one-off logic in an assignable-returnable manner.  Even more, since the logic is already swaddled in a function, you can just copy/paste it out somewhere else if you ever need to extract it!

This is a lot friendlier, I think, than writing ternaries.  More verbose, but easier to follow.

In fact, the only time I think you shouldn't do this is in any performance critical code, since it creates a new function-closure every execution.  There, you'll want to devolve to more imperative-procedural modalities, assuming that's actually where your performance bottleneck is.  You did profile, first, right?

> You could ease the performance hit a bit by extracting the returnable-if into a utility function, in which case it becomes a pure function of its arguments and, more importantly, only defined once, effectively "statically".

```js
// arrow functions are perfect for this sort of use
// due to keeping the same `this` binding as their parent function.
const someValue = (() => {
    if (something === 'thing!') {
        return 'something else entirely';
    }

    if (isFrabjous(something)) {
        return 'callou callay';
    }

    return 'boo';
})();
```
