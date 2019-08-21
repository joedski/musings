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

First, a utility type:

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
type Assignable<T, U> = Nondistributed<T> extends U ? true : false;

/**
 * Determines if two types are mutually assignable to each other.
 * Evaluates to a definite true or false even on unions where one
 * is a superset of another.
 *
 * Results in `true` if both `T` is assignable to `U` and
 * `U` is assignable to `T`, and `false` otherwise.
 */
type MutuallyAssignable<T, U> = Nondistributed<T> extends U ? Nondistributed<U> extends T ? true : false : false;
```

Then I basically just do things like this:

```typescript
// This indicates/asserts that Type1 and Type2 are mutually assignable,
// meaning they are effectively the same type.
const assignable$1$2: MutuallyAssignable<Type1, Type2> = true;
expect(assignable$1$2).toBe(true);

// This indicates/asserts that Type1 and Type2 are NOT mutually assignable,
// meaning that one of the types is different from the other.
const assignable$3$4: MutuallyAssignable<Type3, Type4> = false;
expect(assignable$3$4).toBe(false);
```

The `expect()` assertions aren't technically necessary, they just make sure all the variables are used because I always leave strict mode on.


### Testing Various Things

> TK Testing Various Things!


### Dealing With Overloaded Functions

The best way I've found to deal with overloaded functions is the same way you deal with deep functions: Write a function that would do want you want, then don't call it.  Boom.

In the case of overloaded functions, you call the target function with parameters you know will invoke a certain overload declaration, and test the return type of that.

```typescript
const fn1 = async () => FooModel.findWhere({ bar_id: 4 }, ['id']);
const fn2: () => Promise<{ id: number }[]> = fn1;
const assignable$1$2: MutuallyAssignable<typeof fn1, typeof fn2> = true;

expect(fn1).toBe(fn2);
expect(assignable$1$2).toBe(true);
```

The process is thus:

- `fn1` has its type inferred from the thing assigned to it.
- `fn2` has its type defined by the dev, and has `fn1` assigned to it.
- `assignable$1$2` has its type as an assertion that the types of `fn1` and `fn2` are mutually assignable.
