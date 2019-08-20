2019-08-20 - Overloaded Functions - Picking Your Overload Type
========

Overloads are useful from a programming perspective, especially when describing the often highly polymorphic behavior in JS APIs, but also just for specifying exact behaviors based on inputs' types.

The issue with testing their types is that since there are multiple different types for the same function, you could possibly get different return values, different parameter types, etc.  Further more, especially if dealing with third party code, you might be trying to assert or narrow a type on some method that may have side effects that you really want to avoid executing.

How to get around this, then?

Honestly?  Not really sure.

When you specify type overloads for a function, an Interface is created.  You can also just specify an Interface directly, if you don't want to specify an implementation right away, or want to be able to specify many implementations.

```typescript
interface F {
    (input: true): false;
    (input: false): true;
}

function f2(input: true): false;
function f2(input: false): true;
function f2(input: boolean): boolean {
    return !input;
}

type F2 = typeof f2;

// = true
type F$F2 = F extends F2 ? true : false;
// = true
type F2$F = F2 extends F ? true : false;

// When used with `infer`, the last overload in order is used
// on the assumption it's the most general.
// = true
type FR = ReturnType<F>;
// = true
type F2R = ReturnType<F2>;
```

The problem then is this: How do you pick one of those interface members?

- As of 2019-08-20, [the handbook section on functions](http://www.typescriptlang.org/docs/handbook/functions.html#overloads) isn't really all that helpful.
- At least in TS 2.8, there was [this to say about type inferrence and overloaded functions](https://github.com/Microsoft/TypeScript/wiki/What%27s-new-in-TypeScript#type-inference-in-conditional-types):
    - "When inferring from a type with multiple call signatures (such as the type of an overloaded function), inferences are made from the last signature (which, presumably, is the most permissive catch-all case). It is not possible to perform overload resolution based on a list of argument types."
        - This was [cited as an answer on 2018-05-21](https://github.com/microsoft/TypeScript/issues/24275#issuecomment-390701982).
        - Also stated as [something the team is not currently interested in on 2019-05-07](https://github.com/microsoft/TypeScript/issues/6606#issuecomment-387186188).

So the answer seems to be ... nope, can't do this. (yet?)  Dang.



## Okay, Not in Type Space, but in Execution Space?

Typescript isn't going to be setup to do this in typespace, but can we force a selection by creating a function which if called would call it with specific parameters?

```typescript
function f2o1() {
    return f2(true);
}

// = false
type F2O1T = ReturnType<typeof f2o1>;

function f2o2() {
    return f2(false);
}

// = true
type F2O2T = ReturnType<typeof f2o2>;
```

Note that due to Overloads not being selected in Typespace, we can't genericize this.  Rather, each Overload must be selected by a separate function.

While annoying, it does still give us a way to deal with at least the return types without executing code.



## On Creating Conditional Types for Function Parameters

You could maybe make a wrapper with a conditional type that deals with the parameters, but that doesn't do anything about function _type_ parameters, since those can vary on an overload-by-overload basis.

Likely one of the factors in dealing with overload resolution.
