Amusing Snippets of JS
======================

Silly (possibly) unusual things that I've discovered over the years.



## Create an Empty Array of Some Length

Creating an empty array of some defined length isn't as straight forward in JS as might be expected.  You can't just use `Array(n)`, even though that yields an array with length of `n`; it doesn't work with any of the methods like `map`, `forEach`, etc.

Rather, you need to "reify" the array by passing it through something that expects an Iterator, or uses an Array as an Iterator.  Alternatively, if you use `Function#apply` then that (seemingly) uses the length of the supplied arguments array to determine how to call the target function.

```js
// Array (rather, Iterable) spread
const arr = [...Array(100)]

// Argument spread
const arr = Array(...Array(10))

// Or, ES5 style
// Also useful in Typescript.
const arr = Array.apply(null, Array(10))

// This can also be done using a for-of loop.
for (const x of Array(10)) {
  // NOTE: x will be `undefined`.
  console.log("thing!")
}

// Very verbose way to do the first three statements.
function arrayWithLength(n) {
  const arr = []
  for (const x of Array(10)) {
    // x is `undefined`.
    arr.push(x)
  }
  return arr
}

// create a n->m range
function range(n, m) {
  return [...Array(m - n)].map((e, i) => i + n)
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
console.log(foo.val) // -> 'D:'
delete foo.val;
console.log(foo.val) // -> ':D'
```

Can we go... farther?  Without stack-overflowing, I mean.  Hm.

```js
Function.prototype.constructor === Function
// -> true
```



## Asyncifying a Function

```js
function callAsync(syncFn) {
  return new Promise(r => r(syncFn()));
}

function asyncify(syncFn) {
  return (...args) => callAsync(() => syncFn(...args));
}
```

This works because throwing an error in the Promise Executor (the function you pass to the Promise Constructor) results in that Promise rejecting!  So you don't even need to write your own try/catch block in there, you can just eagerly call `resolve` and know that, should `syncFn` throw, the Promise will `reject` instead.
