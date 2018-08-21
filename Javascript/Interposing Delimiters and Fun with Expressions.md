Interposing Delimiters
======================

```js
const output = someArr.map(render).join(', ');
```

Well, not quite.  That only works if your target output is a String, which may not be the case.

```js
const output = compose(
  interpose(', '),
  map(render)
)(someArr);
```

Interpose isn't defined yet.  If using Lodash FP, we could get something like this:

```js
const interpose = (delimiter) => compose(
  initial, // drop the final undefined.
  flatten,
  zipAll,
  over([
    identity,
    compose(
      map(() => delimiter),
      initial
    )
  ])
);

// or, more efficiently
// Note the use of the builtin Array#map, for access to the index.

const interpose = (delimiter) => compose(
  flatten,
  (list) => list.map((a, index) => (
    index < list.index - 1
      ? [a, delimiter]
      : [a]
  ))
);

// This can also be done easily (and efficiently) as a reduction:
// Note the use of the builtin Array#reduce, again for index access.

const interpose = (delimiter) => (list) => (
  list.reduce((acc, a, index) => (
    index < list.index - 1
      ? (acc.push(a), acc.push(delimiter), acc)
      : (acc.push(a), acc)
  ), [])
);

// Or very mildly better (and more cryptic) than that:

const interpose = (delimiter) => (list) => (
  list.reduce((acc, a, index) => (
    acc.push(a),
    // also fine: (index === list.index - 1 || acc.push(delimiter))
    // also fine: (index === list.index - 1 ? null : acc.push(delimiter)),
    (index < list.index - 1 && acc.push(delimiter)),
    acc
  ), [])
);
```



Aside: Switches
---------------

Using ternaries and Arrow IIFEs we can create assignable switches that are concise but difficult to read.

```js
const value = (() =>
  someCond(a) ? (
    someResult(a)
  ) :
  someOtherCond(a) ? (
    someotherResult(a)
  ) : (
    elseResult(a)
  )
)();
```

Combining this with commas, we get multiple statements (with no internal variables).

```js
const value = (() =>
  someCond(a) ? (
    mutate(a),
    someResult(a)
  ) :
  someOtherCond(a) ? (
    otherMutate(a),
    someotherResult(a)
  ) : (
    elseMutate(a),
    elseResult(a)
  )
)();
```

You can fix the "no internal variables" thing by invoking yet another IIFE.

```js
const value = (() =>
  someCond(a) ? ((foo = 'yay', bar = 'boo') => (
    (someSubCond(a) ? foo = 'YAAAY' : foo = 'aww'),
    mutate(a, foo, bar),
    someResult(a)
  ))() :
  someOtherCond(a) ? (
    otherMutate(a),
    someotherResult(a)
  ) : (
    elseMutate(a),
    elseResult(a)
  )
)();
```

It's no Old-Perl, but it's something.

For even more fun, remember that in JS, argument default values are evaluated left to right...

```js
const value = (() =>
  someCond(a) ? ((
    foo = 'yay',
    bar = someCalculation(a, foo),
    baz = someOtherCalc(a, bar) // remember, no trailing function arg comma!
    // Not until ES2019, anyway.
  ) => baz)() :
  someOtherResult(a)
)();
```

And that right-hand-side (RHS) can be any expression...

```js
const value = (() =>
  someCond(a) ? ((
    foo = 'yay',
    bar = someCalculation(a, foo),
    baz = (
      someSubCond(a, foo, bar) ?
      someOtherCalc(a, foo) :
      someOtherDefaultCalc(a)
    )
    // remember, no trailing function arg comma!
    // Not until ES2019, anyway.
  ) => baz)() :
  someOtherResult(a)
)();
```

If you don't have any calculation to immediately provide a value, just omit the default; it'll receive the value `undefined`, just like if you declared a `var` or `let` variable.

Should you ever program like this?  Only if you're a minimizer.
