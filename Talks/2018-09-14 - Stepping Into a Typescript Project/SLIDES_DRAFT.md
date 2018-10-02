Stepping Into a Typescript Project - Presestation Slides Draft
==============================================================

---

# Things I Encountered Learning TypeScript

## While Stepping Into a Project Mid Way

---

## I Crashed the TSServer

### A Lot

- Combination of Mapped-Object Types, Conditional Types, Overconstraining
- Asked Internet about my specific case and part of it eventually turned into a bug on the Typescript project that got fixed

---

## Issues With Non-Assignability

This one was mostly my fault

What I did:

```typescript
function doTheThing<
  TFoo extends FooShape<TFoo>,
  TBar = BarOfFoo<TFoo>
>(foo: TFoo) {
  // ...
}
```

What I should have done:

```typescript
function doTheThing<
  TFoo extends FooShape<TFoo>
>(foo: TFoo) {
  // Typescript supports block-scoped types
  type TBar = BarOfFoo<TFoo>;
  // ...
}
```

---

## Circular Constraint Errors

Don't do this:

```typescript
type Foo<T> = T extends ...;
function thing<T extends Foo<T>>(t: T) {
  // ...
}
```

---

## Type Parameter Constraint Kudzu

- Another My-Bad
- Had a set of related types for working with config object
- Constraining some parameters eventually led to needed to constrain those same parameters elsewhere
- The constraints were ultimately unnecessary for type safety, and so were useless
- They also bogged down TSServer and sometimes crashed it

---

## Seeming Oddity: Promises Only Parametrize Resolution

Expectation:

```typescript
type Promise<TResolution, TRejection> = ...
```

Actual:

```typescript
type Promise<TResolution> = ...
```

Why?  Because anything can be thrown:

```typescript
try {
  throw undefined;
}
catch (error) {
  // logs "undefined":
  console.log(error);
}
```

---

## Seeming Oddity: Empty Classes/Interfaces can be Anything

TypeScript is Structurally Typed, never Nominally

Combine this with how Javascript will autobox primitive types, and you have this:

```typescript
const foo: {} = 4; // no error.
```

---

## Friction With FP-Style Javascript

Trying to use common JS functional-programming-style things in TypeScript ran into poor type inferrence

Even though `compose()` has correct interfaces written, still have to write all all types or else they're inferred as `{}`

---

## Wrote Unit Tests Instead

- A feature took 3 days to test and implement
- Took whole sprint to write incomplete types
- Wrote unit tests to determine functioning instead
- I learned a lot about TS though so yay?

---

## Conclusion

- TypeScript is nice
- Intellisense and Rename Symbol are nice
- VSCode is nice
- The TypeScript devs are responsive
