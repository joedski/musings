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
- The actual generated code is mostly just assertions on `a === a` because the types are compile-time errors, not run-time errors.
- Type unit tests should be co-located with the relevant functional unit tests.

Obviously, you can use a more test-runner-looking setup with `tsd`, but I'm going vanilla for now, and just depending on `jest` with `ts-jest` to make sure the tests are compiled with `tsc`.

After a lot of [faffing with with type unions and distributive conditional types](./Journal%202019-08-20%20-%20Unit%20Testing%20Negative%20Type%20Assertions.md) I finally arrived at a pretty good way to do things.



## Actual Code

As noted, types are all about assignability, that is "can this be assigned to that".  So, all unit testing of types is going to be geared towards that.

There are two types of assignability we'll be dealing with:

- Is T assignable to U?
- Are T and U mutually assignable to each other?

The latter case is basically asking "Are T and U the same type".  Basically.


### Testing Various Things

The most consistent way I've found to deal with values is to just wrap everything in a function.  Typically we control the inputs to quite a strong degree, and it's the return types that we're really concerned about.  Additionally, wrapping things in functions gets us a few nice things:

- Test assertions are uniform: a function that returns some type, and that return type is what we're concerned about.
- No actual code is executed: this means we can assert certain types for the return values of quite elaborate, possibly asynchronous processes without having to worry about actually executing them.
    - This is predicated on the assumption that every part of that process is properly unit tested elsewhere, of course.

From there, it's just determining what kind of assignability test you're doing.  Is it just that something is assignable to some general interface? (Is T assignable to U)  Or is it that something is exactly some type? (Are T and U mutually assignable)

These two types of assertions differ basically by 1 line.

```typescript
test('T assignable to U', () => {
    // Type inferred by TS.
    const r1 = () => Foo.thing();
    // Type defined by Dev.
    const r2: () => ThingishInterface = r1;

    // Dummy assertion to avoid "unused locals" errors.
    expect(r2).toBe(r1);
});

test('T and U mutually assignable', () => {
    // Type inferred by TS.
    const r1 = () => Foo.thing();
    // Type defined by Dev.
    const r2: () => ThingishInterface = r1;
    // Type defined by TS, reused to guarantee that the type
    // defined by the Dev is assignable to the inferred type.
    const r3: typeof r1 = r2;

    // Dummy assertion to avoid "unused locals" errors.
    expect(r3).toBe(r1);
});
```

And that's about it.


### Dealing With Overloaded Functions

The best way I've found to deal with overloaded functions is the same way you deal with deep functions: Write a function that would do want you want, then don't call it.  Boom.

In the case of overloaded functions, you call the target function with parameters you know will invoke a certain overload declaration, and test the return type of that.

```typescript
const fn1 = async () => FooModel.findWhere({ bar_id: 4 }, ['id']);
const fn2: () => Promise<{ id: number }[]> = fn1;
const fn3: typeof fn1 = fn2;

expect(fn3).toBe(fn1);
```

The process is thus:

- `fn1` has its type inferred from the thing assigned to it.
- `fn2` has its type defined by the dev, and has `fn1` assigned to it.
- `fn3` has its type defined as `typeof fn1`, and has `fn2` assigned to it.

Thus the inferred type and the defined type tested for mutual assignability.


### Dealing with Negative Assertions: T Is _Not_ Assignable To U

There may be cases where you want to ensure some type is _not_ compatible with another type.  The issue there is that when some type incompatibility occurs, that's an error.

If you're using `tsd` or some other such utility, then you're already covered here: you just tell it to expect a type error.

If you want to stay vanilla for whatever reason, you'll need to turn to some extra type machinery.

First, utility types:

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

Then I basically just do things like this:

```typescript
const fn1 = () => Farbanrmle.foo();
// This indicates/asserts that Type1 is NOT assignable to Type2.
const assignable$1$2: Assignable<typeof fn1, () => Type2> = false;
expect(assignable$1$2).toBe(false);

const fn3 = () => Farbanrmle.foo();
// This indicates/asserts that Type3 and Type4 are NOT mutually assignable,
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
