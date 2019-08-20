Journal 2019-08-20 - Unit Testing Negative Type Assertions
=======

How to test cases that should fail in TS?

Some immediate thoughts:

- Most type errors boil down to incompatibility/non-assignability.
- Most type errors should occur at the interface level, not deep down in the bowels of some gigantic chain of methods and parameters.
    - But you might sometimes need to do that too, when running into bugs.

1. Prior Art
    1. [Apparently dtslint can be used for this](https://stackoverflow.com/questions/51194259/asserting-that-typescript-should-fail-to-type-check-some-example-code) but makes assumptions about the project setup?  At least, that's what one commenter said.
        - I guess it's meant primarily for DefinitelyTyped repos?
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

Out of everything, `tsd` looks the most promising.  It'd solve the the most annoying case to deal with, which is that of overloaded functions with type parameters, since you can't really do much about those using the built in type system.  Or can you?  Hm.



## Picking Your Overload

I thought this was going to be a somehat involved topic, but it seems the answer, as of 2019-08-20 anyway, is pretty simple.  See research in [this journal](./Journal%202019-08-20%20-%20Overloaded%20Functions%20-%20Picking%20Your%20Overload%20Type.md).

In summary:

- You can't pick an overload in typespace.
- The only way to narrow return types is to create a wrapper function that supplies parameters of the appropriate input types.  Use this if you want to test specific return types.
- You could maybe make a wrapper with a conditional type that deals with the parameters, but that doesn't do anything about function _type_ parameters, since those can vary on an overload-by-overload basis.



## Using Conditional Types Sorta

You can sorta accomplish negative tests in many cases by using conditional types.

```typescript
type ShouldBeAssignable<T, U> = T extends U ? true : false;
type Foo = { foo: string; bar: number };
type Foooo = { foo: 'foooo', bar: 42 };
const canAssignFooooToFoo: ShouldBeAssignable<Foooo, Foo> = true;
const canAssignFooToFoooo: ShouldBeAssignable<Foo, Foooo> = false;
```

Note however that with Unions the results may not be quite what you expect.  Remember this isn't exact typing, rather this only deals with assignability.

```typescript
type Bar1 = 'foo' | 'bar' | 'baz';
type Bar2 = 'bar' | 'baz';

// = boolean
type Bar1AssignableToBar2 = ShouldBeAssignable<Bar1, Bar2>;
```

Why?  Because `boolean` is treated as the same as the union `true | false`, and [conditional types are distributed across union](http://www.typescriptlang.org/docs/handbook/advanced-types.html#distributive-conditional-types).  How's this play out?

- Start with `ShouldBeAssignable<Bar1, Bar2>`
- This is an alias for `Bar1 extends Bar2 ? true : false`
- When we expand the aliases `Bar1` and `Bar2`, we get `('foo' | 'bar' | 'baz') extends ('bar' | 'baz') ? true : false`
- The conditional type is then distributed over the members of `Bar1`, giving us `('foo' extends ('bar' | 'baz') ? true : false) | ('bar' extends ('bar' | 'baz') ? true : false) | ('baz' extends ('bar' | 'baz') ? true : false)`
- From there' it's easy to see that the conditionals evaluate down to `false | true | true`
- Taking out the redundant `true` we get `false | true` which is the same as `true | false`.
- And as noted, `true | false` is the same as `boolean`, thus we get `boolean` instead of an expected `true` or `false`.
