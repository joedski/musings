Journal 2020-03-23 - The Y Combinator
========

As is "Y are you poking this?".

Nah.

Herein I explore the Y combinator by writing out manually each step of execution.

Looking at [the Wikipedia page](https://en.wikipedia.org/wiki/Fixed-point_combinator#Y_combinator), I see this definition in lambda calculus form:

```
Y = \f. (\x. f(x x)) (\x. f(x x))
```

Where the `\x .` declares a lambda of `x`.

If we just translate that to straight JS, we see this:

```js
const Y = f => (x => f(x(x)))(x => f(x(x)));
```

Which is just inscrutible.  It might help me to give things names, so let's do that:

```js
const Y = fn => {
  const fx1 = fx => fn(fx(fx));
  const fx2 = fx => fn(fx(fx));
  return fx1(fx2);
};
```

Or if you want to be obnoxious,

```js
const Y = (fn,
  fx1 = fx => fn(fx(fx)),
  fx2 = fx => fn(fx(fx))
) => fx1(fx2);
```

But don't do that.

Anyway.  That should help when trying to do some expansions.

So, let's try just passing some unknown function `fn` into `Y`:

- `Y(fn)`
    - `... = fx1(fx2)`
    - `... = fn(fx2(fx2))`
    - `... = fn(fn(fx2(fx2)))`
    - `... = fn(fn(fn(fx2(fx2))))`
    - `... etc.`

Well, that's descriptive.

Let's try to get more concrete, then.  In all of these forms, `fn` is assumed to have the form of `next => x => result`, a pretty familiar form really.

So let's make up a simple adding function:

```js
const addDown = next => n => {
  if (n <= 1) return n;
  return n + next(n - 1);
};
```

What happens then with `Y(addDown)`?

- `Y(addDown)`
    - `... = fx1(fx2)`
    - `... = addDown(fx2(fx2))`
    - `... = addDown(addDown(fx2(fx2)))`
    - `... = addDown(addDown(addDown(fx2(fx2))))`
    - `... etc.`

Which ... doesn't do much except rename `fn`.  Also, it seems to just blow the stack.  Did I implement it wrong?  Or is it that the above definition doesn't work in eager semantics?

It seems reading further on random sources including the (updated, I think) Wikipedia article, this is the case.  For eager languages, you need to defer recursion until you have all the arguments.

Which means a 1-arg implementation in JS would be:

```js
const Y = fn => a => {
  const fx1 = fx => fn(fx(fx));
  const fx2 = fx => fn(fx(fx));
  return fx1(fx2)(a);
};

const $addDown = next => n => {
  if (n <= 1) return n;
  return n + next(n - 1);
};

const addDown = Y($addDown);
```

- `addDown(3)`
    - `... = fx1(fx2)(3)`
    - `... = $addDown(fx2(fx2))(3)`
    - `... = $addDown($addDown(fx2(fx2)))(3)`
    - `... = $addDown($addDown($addDown(fx2(fx2))))(3)`

That seems like it'd blow the stack too.  So, maybe all the intermediaries also need to be lazified.  Let's do that then, update `fx1` and `fx2`:

```js
const Y = fn => a => {
  const fx1 = fx => a => fn(fx(fx))(a);
  const fx2 = fx => a => fn(fx(fx))(a);
  return fx1(fx2)(a);
};
```

Which then gives us...

- `addDown(3)`
- `... = fx1(fx2)(3)`
- `... = (a => $addDown(fx2(fx2))(a))(3)`
- `... = $addDown(a => $addDown(fx2(fx2))(a))(3)`
- `... = 3 + (a => $addDown(fx2(fx2))(a))(3 - 1)`
- `... = 3 + $addDown(a => $addDown(fx2(fx2))(a))(2)`
- `... = 3 + 2 + (a => $addDown(fx2(fx2))(a))(2 - 1)`
- `... = 3 + 2 + $addDown(a => $addDown(fx2(fx2))(a))(1)`
- `... = 3 + 2 + 1`
- `... = 6`

Ah hah.

Interesting, this seems suggestive of something about just how lazy and eager execution models differ, and about how one can go about translating between them.  One such thing: in the eager mode, you must explicitly write out all deferral of execution, which was done in the above example by always writing out all parameters

Of course, you don't actually need the Y combinator in JS, because you can both:

1. refer to a function by its own name in its body, and
2. refer to free variables.

Case 1:

```js
function addDown(n) {
  if (n <= 1) return n;
  return n + addDown(n - 1);
}
```

Case 2:

```js
const addDown = n => {
  if (n <= 1) return n;
  return n + addDown(n - 1);
};
```

Note also that this means in JS, we can write out this Y function as:

```js
const Y = fn => (...args) => fn(Y(fn))(...args);
```

Which is amusingly succinct.

But then, the original environment, lambda calculus, was extremely bare-bones, and the proscription against free variables especially harsh (A combinator is a "closed lambda expression", where "closed" meant "no free variables"), and that's part of why the original Y-combinator was so interesting: it showed you could create recursive functions in an environment that didn't seem to support recursion on the surface of it.



## Aside: n-args Form in JS

As an aside: the n-args form is simple in JS: you can either pass an array or ... an array, but using rest-args syntax.  The latter might have some benefits.  Or not.

```js
const Y = fn => (...args) => {
  const fx1 = fx => (...args) => fn(fx(fx))(...args);
  const fx2 = fx => (...args) => fn(fx(fx))(...args);
  return fx1(fx2)(...args);
};
```

This also means you can type it in TypeScript:

```typescript
type Y<TArgs extends any[], R> =
  (fn: (next: (...args) => R) => (...args: TArgs) => R) =>
    (...args: TArgs) => R;
```

If you're thinking "that's a tuple, not an array", then you're right.  But while many languages and TypeScript's type system have a notion of tuples, JS doesn't, and TypeScript's tuples are just fixed-length, fixed-element-type JS arrays.

Anyway, that only covers the definition of Y itself.  What you can't exactly type are those two functions that enable the recursion, which I named `fx1` and `fx2`.  What are they?

They're functions that accept themselves as the first argument, which means their type could only be defined in terms of themself.  Oof.

Did you notice the original Y Combinator was given in _untyped_ lambda calculus?  I think that's one reason it works there: to invoke recusive behavior means you also need a recursive type if you want to know the type of that expression!  And I think that was also the point being made with it: there's 

```typescript
type YFX<N, A, R> = (fx: YFX<N, A, R>) => (a: A) => R;
```

That has self-referential recursion.  How about, um.

```typescript
type YFXd<N, A, R> = (fx: N) => (a: A) => R;
type YFX<A, R> = YFX<YFX<...???, A, R>, A, R>;
```

Yeah.

The cheap route would be just to escape with `any`:

```typescript
type YFX<A, R> = (fx: ((nfx: any) => (a: A) => R)) => (a: A) => R;
```

Of course, that's not really necessary, since TypeScript actually allows the first type-recursive definition, but the point was to try to create a non-recursive type, which we can't do.  If we allow recursion, though, we again just get the simpler definition:

```typescript
function Y<A, R>(
    fn: (next: (a: A) => R) => (a: A) => R
): (a: A) => R {
    return (a: A) => fn(Y(fn))(a);
}
```

And you can make the adjustments mentioned before if you want n-arity support.

Amusingly, there's a place where this is possibly useful, and that's if you want to recur with anonymous functions.  However, I feel in that case you'd still be better off just actually naming the darn thing, whether by using a named function or by referencing a const the function is assigned to, because it's much clearer what's going on.
