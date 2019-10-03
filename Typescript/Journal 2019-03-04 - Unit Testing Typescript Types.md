Journal 2019-03-04 - Unit Testing Typescript Types
==================================================

> haha wow this has been sitting around a LONG time and I just now actually did something about it.  While this journal lays out some testing methodologies for types, [a later journal covers how I arrived at some of those methodologies, such as testing negative type assertions](./Journal%202019-08-20%20-%20Unit%20Testing%20Negative%20Type%20Assertions.md)

1. https://koerbitz.me/posts/unit-testing-typescript-types-with-dtslint.html
    - Apparently this is more geared towards repos for Definitely Typed.
2. [dtslint repo](https://github.com/Microsoft/dtslint)
    - Uses line comments in the form of `// $ExpectType <type expression>` or `// $ExpectError` for those assertions.
3. [tsd](https://www.npmjs.com/package/tsd) seems pretty close to what I want, really.
    - According one [one running issue](https://github.com/SamVerschueren/tsd/issues/10) it should be noted that this deals not with exact types but with assignability.
        - Though, it seems like you should be able to assert something close to that by seeing if both types are both assignable to each other?  i.e. `T extends U ? U extends T ? true : false : false`
            - Ah, I see the issue, that won't work with Unions, it'll just narrow them to those items which they have in common.  Hm.
    - It seems to work by extending tsc to have special behavior around its assertion functions.  Neat.
4. [typings-tester](https://www.npmjs.com/package/typings-tester) seems to just compile the files and either pass or fail them, so your assertions would be written as individual files for your case or case groups.
    - Presumably with the actual errors reported to the test runner, of course.
    - Uses a similar method to `dtslint` for expecting errors, using a comment `// typings:expect-error` to flag a unit that should fail.

The basic idea I decided to follow was this:

- The unit test for a Type is whether TSC successfully compiles the file.
- Type Unit Tests are about assignability, since Types themselves are about assignability.
- The actual generated code is mostly just assertions on `a === a` because the type errors are compile-time errors, not run-time errors.
- Type unit tests should be co-located with the relevant functional unit tests.  This could be by being in the same file, or by being in a neighboring file with a similar name.

Obviously, you can use a more test-runner-looking setup with `tsd`, but I'm going vanilla for now, and just depending on `jest` with `ts-jest` to make sure the tests are compiled with `tsc`.

Another option, especially if your test setup currently doesn't compile `.ts` files, is to just run type tests as a separate step: you have a bunch of files that you run through `tsc` and any errors mean a type unit test failed somewhere.  So, you don't even need TS support in a test runner, it just makes things more convenient.

After a lot of [faffing with with type unions and distributive conditional types while trying to figure out negative assertions](./Journal%202019-08-20%20-%20Unit%20Testing%20Negative%20Type%20Assertions.md) I finally arrived at a pretty good way to do things, or at least a good starting point.



## Actual Code

As noted, types are all about assignability, that is "can this be assigned to that".  So, all unit testing of types is going to be geared towards that.

There are two types of assignability we'll be dealing with:

- Is T assignable to U?
    - This case is used when you want to ensure some value or result you're dealing with conforms to some broader interface or type.
    - This is most frequently caught by build errors, but it can be nice to have it explicitly encoded into your tests, too.
- Are T and U mutually assignable to each other?
    - This case is used when you want to ensure some value or result you're dealing with is exactly some type.  It's basically asking "Are T and U the same type".  Basically.

> As a quick note about the code examples, I'm currently doing my tests in Jest, hence the Jest `expect()` assertions.  If you're doing separate files and just running them through `tsc`, you can just export something or flag it as ignored to prevent no-unused-locals errors.


### Testing Various Things

The most consistent way I've found to deal with values is to just wrap everything in a function.  Typically we control the inputs to quite a strong degree, and it's the return types that we're really concerned about.  Additionally, wrapping things in functions gets us a few nice things:

- Test assertions are uniform: a function that returns some type, and that return type is what we're concerned about.
- No actual code is executed: this means we can assert certain types for the return values of quite elaborate, possibly asynchronous processes without having to worry about actually executing them.
    - This is predicated on the assumption that every part of that process is properly unit tested elsewhere, of course.

From there, it's just determining what kind of assignability test you're doing.  Is it just that something is assignable to some general interface? (Is T assignable to U)  Or is it that something is exactly some type? (Are T and U mutually assignable)

These two types of assertions differ basically by 1 line.

```typescript
test('T assignable to U', () => {
    const r1 = () => Foo.thing();
    const r2: () => ThingishInterface = r1;

    // Dummy assertion to avoid "unused locals" errors
    // and Jest complaining about no assertions.
    expect(r2).toBe(r1);
});

test('T and U mutually assignable', () => {
    const r1 = () => Foo.thing();
    const r2: () => ThingishInterface = r1;
    const r3: typeof r1 = r2;

    // Dummy assertion to avoid "unused locals" errors
    // and Jest complaining about no assertions.
    expect(r3).toBe(r1);
});
```

The process is thus:

- `r1` has its type inferred by Typescript from the thing assigned to it.
- `r2` has its type defined by the dev, and has `r1` assigned to it.
    - This is used for both normal-assignability and mutual-assignability tests.
    - The Dev defining the type puts in written form what type is expected.
    - The assignment itself evaluates if the inferred type is assignable to the defined type.
- `r3` has its type defined as `typeof r1`, and has `r2` assigned to it.
    - This is only for mutual-assaignability tests, or basically exact-type tests.
    - The assignment here evaluates if the defined type of `r2` is also assignable to the inferred type of `r1`.

And that's about it.  You can do this either as part of your other test cases or as their own test cases.  Just group things logically.


### Dealing With Overloaded Functions

[The best way I've found to deal with overloaded functions is the same way you deal with deep functions and other non-simple workflows](Journal%202019-08-20%20-%20Overloaded%20Functions%20-%20Picking%20Your%20Overload%20Type.md): Write a function that would return want you want, then don't call it.  Boom.

In the case of overloaded functions, you call the target function with parameters you know will invoke a certain overload declaration, and test the return type of that.

```typescript
interface Thing {
    id: number;
    name: string;
}

function getThing(): Thing;
function getThing(props: []): Thing;
function getThing<TProps extends (keyof Thing)[]>(props: TProps): Pick<Thing, TProps[0]>;
function getThing(props: (keyof Thing)[] = []): Partial<Thing> {
    const thing = someOtherService.getThing();
    if (!props.length) return thing;
    return props.reduce((acc, propName) => {
        acc[propName] = thing[propName];
        return acc;
    }, {});
}

// Here we pick the third overload by passing a non-empty array.
const fn1 = () => getThing(['id']);
const fn2: () => { id: number } = fn1;
const fn3: typeof fn1 = fn2;

expect(fn3).toBe(fn1);
```

Thus the inferred type and the defined type can be tested for mutual assignability.


### Testing Utility Types Without Concrete Values

It's also possible to test utility types without using concrete values.  I'm not sure if it's better or not, but eh, it's there.  Maybe as a first line of testing, along side actual concrete-value assignment?

To start with, we'll want some utility types just to make things read more nicely:

```typescript
/**
 * Used as simple wrapping around a type to prevent
 * other conditional types from invoking distributive behavior
 * on naked type parameters.
 *
 * @see http://www.typescriptlang.org/docs/handbook/advanced-types.html#distributive-conditional-types
 */
type Nondistributed<T> = T extends any ? T : never;

/**
 * Determines if type `T` is assignable to type `U`.
 * Evaluates to a definite true or false even on unions where one
 * is a superset of another.
 *
 * Results in `true` if `T` is assignable to `U`,
 * and `false` otherwise.
 */
export type Assignable<T, U> = Nondistributed<T> extends U ? true : false;

/**
 * Determines if two types are mutually assignable to each other.
 * Evaluates to a definite true or false even on unions where one
 * is a superset of another.
 *
 * Results in `true` if both `T` is assignable to `U` and
 * `U` is assignable to `T`, and `false` otherwise.
 */
export type MutuallyAssignable<T, U> = Nondistributed<T> extends U ? Nondistributed<U> extends T ? true : false : false;
```

These themselves can be tested easily enough:

```typescript
type T1 = 'foo' | 'bar' | 'baz';
type T2 = 'foo' | 'bar';

// A superset union shouldn't be assignable to a subset one.
const assignable1: false = false as Assignable<T1, T2>;

// A subset union should be assignable to a superset.
const assignable2: true = true as Assignable<T2, T1>;

// A subset and superset should not be mutually assignable,
// since the superset cannot be assigned to the subset.
const mutuallyAssignable1: false = false as MutuallyAssignable<T1, T2>;

// A type should be mutually assignable with itself.
const mutuallyAssignable2: true = true as MutuallyAssignable<T2, T2>;
```

Those are written backwards from usual because we want to ensure that the type that those compute to actually matches the type we declare, and don't get expanded to `boolean` because of union-distribution.  So we annotate the const with what we intend, then cast a true or false to the types themselves.  Then, if any of them are either the opposite type, or end up as `boolean`, we'll see a type error.

Then we can go on to testing other types.

```typescript
type T3 = { foo: string; bar: number; };
type T4 = { foo: string; } & { bar: number; };
type T5 = { foo: string; };

const mutuallyAssignable3: MutuallyAssignable<T3, T4> = true;
const assignable3: Assignable<T3, T5> = true;
const assignable4: Assignable<T5, T3> = false;

type T6 = {
    foo: Promise<string>;
    bar: Promise<number>;
};

type PromisedProps<T> = {
    [K in keyof T]: Promise<T[K]>;
};

const mutuallyAssignable4: MutuallyAssignable<PromisedProps<T3>, T6> = true;
const mutuallyAssignable5: MutuallyAssignable<PromisedProps<T4>, T6> = true;
```

This isn't the most useful by itself, since all we get is either a `true` or `false`, whereas the assignment tests in prior sections will give more detailed errors beyond "true is not assignable to false".  Where such direct type testing is more useful is in negative assertions.


### Dealing with Negative Assertions: T Is _Not_ Assignable To U

There may be cases where you want to ensure some type is _not_ compatible with another type.  The issue there is that when some type incompatibility occurs, that's an error.

If you're using `tsd` or some other such utility, then you're already covered here: you just tell it to expect a type error.

If you want to stay vanilla for whatever reason, you'll need to turn to some extra type machinery.

Then I basically just do things like this:

```typescript
const fn1 = () => Farbanrmle.foo();
// This indicates/asserts that the type of fn1 is NOT assignable to Type2.
const assignable$1$2: Assignable<typeof fn1, () => Type2> = false;
expect(assignable$1$2).toBe(false);

const fn3 = () => Farbanrmle.foo();
// This indicates/asserts that the type of fn3 and Type4 are NOT mutually assignable,
// meaning that one of the types is different from the other.
const assignable$3$4: MutuallyAssignable<typeof fn3, () => Type4> = false;
expect(assignable$3$4).toBe(false);
```

Once again, the `expect()` assertions aren't technically necessary, they just make sure all the variables are used because I always leave strict mode on, and because Jest gets suspicious if you have a test case with no assertions.

This can also be applied to types themselves if, say, you want to ensure your complex type derivation thingy excludes some specific case.

```typescript
// Define the types we're testing...
type T1 = MyFancyType<'fancy' | 'params'>;
type T2 = SomeTypeIWantToAvoid;

// and that our fancy type should not be assignable to that other one.
const assignable: Assignable<T1, T2> = false;

// no unused, ensure at least 1 assertion.
expect(assignable).toBe(false);
```


### Dealing With Unknown and Void

Interesting edge case: you have to be careful around functions with return types if the return types are `void` and/or `unknown`.  The following won't cause any build errors as of TS 3.5.x:

```typescript
const f0: () => unknown = () => {};
const f1: () => void = f0;
const f2: typeof f0 = f1;
```

However, if you deal with a value, you do get an error:

```typescript
const a0: unknown = undefined;
// Error: Type 'unknown' is not assignable to type 'void'.
const a1: void = a0;
const a2: unknown = a1;
```

My guess is that functions which return `unknown` could return `undefined`, and that if you have some interface that specifies a function that returns `void`, it means you're expected/expecting to discard the value, which leads to no incompatibility.  Or something.  Note that this doesn't stop you from actually assigning the value returned by a function that says it's returning `void`.

Values themselves, however, do not allow you to assign `unknown` to `void`, because `unknown` could be something other than `void` (`undefined`).  I guess?

The only way to do that assignment without actually executing anything I can think of is to just wrap such execution in a function.  Perhaps that should be the way to do all of them, then.

```typescript
// we still get the type error, but we don't need to execute the code.
function testUnknownAndVoid() {
    const a0: unknown = undefined;
    // Error: Type 'unknown' is not assignable to type 'void'.
    const a1: void = a0;
    const a2: unknown = a1;
}

// perfunctory assertion and variable use.
expect(testUnknownAndVoid).toBe(testUnknownAndVoid);
```



## Further Explorations on Type Assignability Testing

As shown above, types can sometimes get a bit hairy with things like `void` and function return types.  I think what I might need to do is to more systematically try different places for assignability, as well as read through the Typescript docs again just to refresh things.

Places to try:

- Variable Types (let, const, var)
- Function Parameter Types
- Function Return Types
- Interface Member Types: Values, Methods
- Class Member Types: Values, Methods

```typescript
let v0: unknown = 'a';
// Type 'unknown' is not assignable to type 'void'.
const v1: void = v0;
v0 = v1;

let fp0: (a: unknown) => void = (a) => { console.log(a); };
const fp1: (a: void) => void = fp0;
// Type '(a: void) => void' is not assignable to type '(a: unknown) => void'.
//   Types of parameters 'a' and 'a' are incompatible.
//     Type 'unknown' is not assignable to type 'void'.
fp0 = fp1;

// ... no type errors.
let fr0: () => unknown = () => Math.random();
const fr1: () => void = fr0;
fr0 = fr1;
```


### Objects and Optional Properties

There's also the wrinkle on objects/object-interfaces/classes that optional props don't matter between different types as long as the non-optional ones match:

```typescript
let part0: { a: string, b?: number } = { a: 'string' } as { a: string, b?: number };
const part1: { a: string, c?: number } = part0;
part0 = part1;
```

That's just due to how TS handles assignability of objects.  Not sure how to get around that without modifying types.

Closest I can think of is to take the type you expect and do some type mapping with the one you receive.  Something like: any properties that don't show up in both, mark never?  That should elicit a type error... somewhere.

```typescript
let part0: { a: string, b?: number } = { a: 'string' } as { a: string, b?: number };
// Type '{ a: string; b?: number | undefined; }' is not assignable to type '{ a: string; b?: undefined; c?: number | undefined; }'.
//   Types of property 'b' are incompatible.
//     Type 'number | undefined' is not assignable to type 'undefined'.
//       Type 'number' is not assignable to type 'undefined'.
const part1: { a: string, b?: never, c?: number } = part0;
part0 = part1;
```

Okay, so from that we'd want to do something like this:

```typescript
type PartReceived = { a: string, b?: number };
type PartExpected = { a: string, c?: number };
type PartExpectedTest = { a: string, b?: never, c?: number };
```

We can do this, I think, by intersecting our `PartExpected` with some type that has any keys in `PartReceived` not in `PartExpected` changed to have the value-type `never`:

```typescript
type StrictObjectExpectation<TExpected extends object, TReceived extends object> =
    TExpected & DisallowKeysNotIn<TReceived, TExpected>;

type DisallowKeysNotIn<TSource, TForbidden> = {
    [K in Exclude<keyof TSource, keyof TForbidden>]: never;
};
```

A first test seems to show the desired behavior:

```typescript
interface AB {
    a: string;
    b?: number;
}

interface AC {
    a: string;
    c?: number;
}

// Here however we now get an error.
let strictA0: AB = { a: 'foo', b: 5 } as AB;
// Type 'AB' is not assignable to type 'StrictObjectExpectation<AC, AB>'.
//   Type 'AB' is not assignable to type 'DisallowKeysOfTypeNotIn<AB, AC>'.
//     Types of property 'b' are incompatible.
//       Type 'number | undefined' is not assignable to type 'never'.
//         Type 'undefined' is not assignable to type 'never'.
const strictA1: StrictObjectExpectation<AC, AB> = strictA0;
strictA0 = strictA1;
```

That would seem to work, but doesn't quite:

```typescript
// We can't even assign a correct value, though:
// Type '{ a: string; c: number; }' is not assignable to type 'StrictObjectExpectation<AC, AB>'.
//   Property 'b' is missing in type '{ a: string; c: number; }' but required in type 'DisallowKeysOfTypeNotIn<AB, AC>'.
const strictAC: StrictObjectExpectation<AC, AB> = { a: 'foo', c: 42 };
// We can however assign if a type has all the same keys:
const strictAcAc: StrictObjectExpectation<AC, AC> = { a: 'foo', c: 42 };```

So maybe that's actually fine?  Because if the type matched the intended one, then it'd work fine as there would be no properties with type `never`, since that means you've got a mismatch.  So yes, that's actually in line with intended behavior.

This could only be used, of course, if you expect a type to exactly match, property for property, or rather here if you expect a type to have exactly the same keys.  Which is fine, since keys that they do share will already run afoul of property-wise assignability, with things like `Type 'number | undefined' is not assignable to type 'boolean | undefined'`, etc.

```typescript
interface AB2 {
    a: string;
    b?: boolean;
}

let aa0: AB = { a: 'foo', b: 2 };
// error here!
const aa1: AB2 = aa0;
// ... and here!
aa1 = aa0;
```
