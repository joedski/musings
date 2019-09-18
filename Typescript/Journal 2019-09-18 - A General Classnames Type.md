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

[Oh ho](https://github.com/vuejs/vue/blob/95d8afa07c4a84d6c178e220913cec4b1afcf21d/types/vnode.d.ts#L5).  I forgot that interface-bases were lazy.  This means we can trampoline between types.  I should probably write this down somewhere.

```typescript
type T = string | Record<string, boolean> | boolean | null | void;
type AT = T | TArr;
interface TArr extends Array<AT> {}

const c1n0: AT = 'foo bar';
const c1n1: AT = { 'beep-boop': true };
const c1n2: AT = [
  'foo bar',
  { 'beep-boop': true },
];
const c1n3: AT = [
  'foo bar',
  { 'beep-boop': true },
  [
    'baz',
    { 'barghle': false },
  ],
  [
    'a',
    [
      'b',
      {
        c: true,
      },
      [
        'd',
      ],
    ],
  ],
];
```

Can we generalize that?

```typescript
// What we're trying to do:
// type N<T> = T | (N<T>)[];

// Here's an example of something like that:
type T = string | boolean;
type AT = T | TArr;
interface TArr extends Array<AT> {}

// So how about this?
type N<T> = T | NArr<T>;
interface NArr<T> extends Array<N<T>> {};

const n0: N<T> = true;
const n1: N<T> = [
  true,
  false,
];
const n2: N<T> = [
  [true, false],
  false,
  [[true, [false]], true],
];
```

Nice.

Let's give it a better name, though:

```typescript
/**
 * A type union of a given Type itself or an arbitrarily-deeply nested
 * array of that Type itself or arrays thereof.
 * 
 * Like this:
 * 
 *     type C<T> = T | (T | (T | (T...)[])[])[];
 * 
 * but not running afoul of immediate-circular-reference errors in TS.
 */
export type TypeOrDeepArrayOf<T> = T | ArrayTypeInTypeOrDeepArrayOf<T>;
// interface base-resolution is lazy in TS, which allows us to trampoline
// between this type and TypeOrDeepArrayOf<T> to nest as deeply as is necessary.
interface ArrayTypeInTypeOrDeepArrayOf<T> extends Array<TypeOrDeepArrayOf<T>> {}
```

Now we can use that for our actual Classnames type:

```typescript
type AnyClassnames = TypeOrDeepArrayOf<
    | string
    | Record<string, boolean>
    | boolean
    | null
    | void
    // probably a few others...
>;
```
