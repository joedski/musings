Conditional Functions
=====================

How to rewrite something like this to be more functional?

```js
function maybeGetBarOfFoo(state, fooId) {
  const foo = getFoo(state, fooId);
  if (! foo) return null;
  return getBar(state, foo.barId);
}
```

There's the Conditional Ternary Operator which allows for something close:

```js
function maybeGetBarOfFoo(state, fooId) {
  return getFoo(state, fooId)
    ? getBar(state, getFoo(state, fooId).barId)
    : null
    ;
}
```

What about something we can compose?

```js
const maybeGetBarOfFoo = (state, fooId) => compose(
  maybeDo(id => getBar(state, id)),
  maybeDo(get('barId')),
  id => getFoo(state, id),
)(fooId);
```

```js
function maybeDo(fn) {
  return (val) => (val ? fn(val) : val);
}
```

That's good if we're dealing with anything falsy, but what about specific checks?

```js
function doIf(predicate) {
  return (fn) => (...args) => (predicate(...args) ? fn(...args) : args[0]);
}
```

Or maybe more generally...

```js
function cond(predicate, ifTrue, ifFalse) {
  return (...args) => (
    predicate(...args)
      ? ifTrue(...args)
      : ifFalse(...args)
  );
}
```

Then,

```js
const ifTruthy = (fn) => cond((val => Boolean(val)), fn, (arg => arg));
const ifNotNil = (fn) => cond((val => val != null), fn, (arg => arg));
```

That's much more precise.

```js
const maybeGetBarOfFoo = (state, fooId) => compose(
  ifNotNil(id => getBar(state, id)),
  ifNotNil(get('barId')),
  id => getFoo(state, id),
)(fooId);
```

If we curried the `get*` functions, this could be even more succinct:

```js
const maybeGetBarOfFoo = state => fooId => compose(
  ifNotNil(getBar(state)),
  ifNotNil(get('barId')),
  getFoo(state)
)(fooId);

// Or going full curry,
const maybeGetBarOfFoo = state => compose(
  ifNotNil(getBar(state)),
  ifNotNil(get('barId')),
  getFoo(state)
);
```

These are sorta treating values that might be null as a Maybe monad... Hm!



### Cond?  That looks familiar...

There's a much more comprehensive `cond` in Lodash:

```js
const L = require('lodash/fp');

const ifTruthy = (fn) => L.cond([
  [Boolean, fn],
  [L.stubTrue, L.identity],
]);

const ifNotNil = (fn) => L.cond([
  [L.not(L.isNil), fn],
  [L.stubTrue, L.identity],
]);
```

Which is taken straight from...

```lisp
(cond (
  (condition1) (action1)
  (condition2) (action2)
  (conditionN) (actionN)
  ))
```

Yep.
