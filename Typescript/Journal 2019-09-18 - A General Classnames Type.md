Journal 2019-09-18 - A General Classnames Type
========

The utility function [classnames](https://www.npmjs.com/package/classnames) lets you pass in a number of things which it will concatenate down into a string:

- A string, of course
- An object of `{ [key: string]: boolean }` for conditional class names
- An array of either of the above, or of an array of any of the above, or array of array of...

No real progress here, just some faffing.

```typescript
type T = string | Record<string, boolean>;

// More or less what we want:
// type C = T | (T | (T | (T...)[])[])[];

// not valid because `type` means "type alias" and is
// eagerly expanded.
// Error: Type alias 'N' circularly references itself.
type N<T> = T | (N<T>)[];

// This works, but we end up with only indices, no array methods.
type N1<T> = T | {
  [i: number]: N1<T>;
};

type C = N1<T>;

const c0: N1<T> = 'foo bar';
const c1: N1<T> = { 'beep-boop': true };
const c2: N1<T> = [
  'foo bar',
  { 'beep-boop': true },
];
const c3: N1<T> = [
  'foo bar',
  { 'beep-boop': true },
  [
    'baz',
    { 'barghle': false },
  ],
];

// Type Error: Property 'forEach' does not exist on type '{ [i: number]: N1<T>; }'.
c3.forEach
```
