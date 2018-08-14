Daggy in Typescript - Is It Possible?
=====================================

Possible to generalize, sorta, anyway.

[daggy](https://github.com/fantasyland/daggy) is neat, but doesn't care about types.  Typescript is strictly typed, and doesn't jive quite yet with how dynamically daggy works.

Research
1. [One proposed answer for mapping arrays-as-tuples to unions](https://stackoverflow.com/questions/45251664/typescript-derive-union-type-from-tuple-array-values)
  1. Requires the use of a [tuple](https://gist.github.com/jcalz/381562d282ebaa9b41217d1b31e2c211) utility function, though.

Not sure if there's really way to do this, though.  Not without invoking actual extra machinery.  Still, item 1 is rather tantalizing, and my puzzle senses are tingling.

Looking at the typing for the Tuple function itself, we have:

```
export type Lit = string | number | boolean | undefined | null | void | {};

// infers a tuple type for up to twelve values (add more here if you need them)
export function tuple<A extends Lit, B extends Lit, C extends Lit, D extends Lit, E extends Lit, F extends Lit, G extends Lit, H extends Lit, I extends Lit, J extends Lit, K extends Lit, L extends Lit>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J, k: K, l: L): [A, B, C, D, E, F, G, H, I, J, K, L];
// ...
export function tuple<A extends Lit, B extends Lit>(a: A, b: B): [A, B];
export function tuple<A extends Lit>(a: A): [A];
export function tuple(...args: any[]): any[] {
  return args;
}
```

It looks like if we stipulate that `A extends string` then Typescript will narrow `A` to just the specific string.  Hmm.


### Try That Trick In Isolation, On Just a String

```js
type SL<A extends string> = A;

const foo = 'foo';
type Foo = SL<typeof foo>;
// => type Foo = "foo"
```

Indeed, so!  Hm.  In the case of daggy, we don't need that `Lit` union type, we just need `string`, so that's slightly less complicated.


### Try That Trick with a Tuple

Suppose we want to handle duples, just to give a case where we have multiple values but not too many.

```js
type StringDuple<T2 extends [any, any]> =
  T2 extends [infer A, infer B] ? [A, B] : never;

const foo = ['foo', 'bar'];
type Foo = StringDuple<typeof Foo>;
```

Damn, doesn't work because foo itself is not a tuple, an array of strings, and Arrays and Tuples are distinct in Typescript.


### Maybe Functions Will Help?

Well, since we have a wrapping function anyway, maybe we can just define the types of that wrapper?

Granted, that's basically what `tuple.ts` does, so, we're back to that.

We'll just expect an input tuple instead of using the args themselves.

```js
// Basically the same as:
//   function tuple<A extends Lit, B extends Lit>(a: A, b: B): [A, B];
// but with an array input.
function stringDuple<A extends string, B extends string>(t2: [A, B]): [A, B] {
  return t2;
}

// We can also write...
function stringDuple<A extends string, B extends string, T2 extends [A, B]>(t2: T2): T2 {
  return t2;
}
```

That does work.  Hm.


### And with Objects?

We know that when treating objects as string-value maps, Typescript has support for indexing over those property keys, tooling added as a way to type this common JS idiom.

That is, given an object like `{ [K: string]: any }` we can do something like this:

```js
type Getter<T> = () => T;

type Getterified<T> = {
  [K in keyof T]: Getter<T[K]>;
}

function getterify<T extends { [k: string]: any }>(t: T): Getterified<T> {
  const gt: Getterified<T> = {};
  Object.entries(t).forEach(([k, v]) => {
    gt[k] = () => v;
  });
  return gt;
}
```

We should be able to combine that with the `StringDuple` example above to achieve the desired outcome.

Going back to just the 2-Tuple case,

```js
type StringDuple<T2 extends [any, any]> =
  T2 extends [infer A, infer B] ? [A, B] : never;

function dupleToObjectCreator<T extends [string, string], A, B>(t: StringDuple<T>) {
  return function createObject(a: A, b: B) {
    return {
      [t[0]]: a,
      [t[1]]: b,
    };
  };
}

const createPoint = dupleToObjectCreator(['x', 'y']);
// :: <A, B>(a: A, b: B) => { [x: string]: A | B; }
const pointA = createPoint(1, 6);
// :: { [x: string]: number }
```

Er, hm, doesn't quite work.  Oh, right, need to make sure the tuple's contained types extend string.

```js
function dupleToObjectCreator<
  KA extends string,
  KB extends string
>(t: [KA, KB]) {
  return function createObject<A, B>(a: A, b: B) {
    return {
      [t[0]]: a,
      [t[1]]: b,
    };
  };
}

const createPoint = dupleToObjectCreator(['x', 'y']);
// :: <A, B>(a: A, b: B) => { [x: string]: A | B; }
const pointA = createPoint(1, 6);
// :: { [x: string]: number }
```

Maybe the problem is that we don't have any explicit link between the two tuples?  How could we accomplish this?  Maybe we need to define an explicit mapping between pairs of n-tuples.

Possibly related snippet?

```js
const a: ['a', 'b'] = ['a', 'b'];
type A0 = typeof a[0];
// type A0 = "a"
```

Though, possibly not helpful since `a[0]` is a value, not a type.

```js
const a: ['a', 'b'] = ['a', 'b'];
type A = typeof a;
type A0 = A[0];
```

There we go, I think.

```js
type Zipper2Tuple<
  K0 extends string,
  K1 extends string,
  V0, V1,
  TKs extends [K0, K1],
  TVs extensd [V0, V1]
>(tks: TKs, tvs: TVs): { [TKs[0]]: TVs[0], [TKs[1]]: TVs[1] } {
  return {
    [tks[0]]: tvs[0],
    [tks[1]]: tvs[1],
  };
}
```

Er, wait, I think I got lost somewhere in there, that's nonesense.  Let's try that again.

```js
type Zipper2Tuple<TKs extends [string, string], TVs extends [any, any]> =
  TKs extends [infer K0, infer K1]
  && K0 extends string
  && K1 extends string
  && TVs extends [infer V0, infer V1]
  ? { [K0]: V0, [K1]: V1 }
  : never
  ;
```

Okay, can't use `&&` as and there.

```js
type Zipper2Tuple<TKs extends [string, string], TVs extends [any, any]> =
  TKs extends [infer K0, infer K1]
  ? K0 extends string
  ? K1 extends string
  ? TVs extends [infer V0, infer V1]
  ? { [K0]: V0, [K1]: V1 }
  : never : never : never : never
  ;
```

Typescript complains that `K0` and `K1` are being used as values instead of types.  Okay, no dice there.

Hmmmmm.

How about starting with just constant types for the values?

```js
function point<
  A extends string,
  B extends string,
  NS extends [A, B]
>(names: [A, B]): { [K in NS[number]]: number } {
  return {
    [names[0]]: 0,
    [names[1]]: 0,
  };
}
```

> EDIT: Actually, this does work, but only when called.  It still thinks the assignment is invalid.  (I forgot the `:` the first time around.)

Doesn't quite seem to work... But if I do this:

```js
type N2Point<NS extends [string, string]> =
  NS extends [infer N0, infer N1]
  ? N0 extends string
  ? N1 extends string
  ? {
  [K in [N0, N1][number]]: number
} : never : never : never;

function point<
  A extends string,
  B extends string,
  NS extends [A, B]
>(names: NS): N2Point<NS> {
  // Typescript complains here that { [x: string]: number }
  // is not assignable to N2Point<NS>
  return {
    [names[0]]: 0,
    [names[1]]: 0,
  };
}

// But this does work.
const p0 = point(['x', 'y']);
// :: { x: number, y: number }
```

Typescript correctly types p0.  I guess this is why with `tuple.ts` they created the function type defs first, then the actual underlying function they just used `(...args: any[])`.  While functionally, the results of all the interfaces are the same to JS, they have different reified types in TS due to matching different interfaces.

Hence, the proper way to do the above would be:

```
function point<
  A extends string,
  B extends string,
  NS extends [A, B]
>(names: NS): { [K in NS[number]]: number };
function point(names: any[]): { [x: string]: number } {
  return {
    [names[0]]: 0,
    [names[1]]: 0,
  };
}

const p0 = point(['a', 'b']);
```

> NOTE: I noticed that I forgot a colon, and that's why TS was complaining about a type being used in a value position.


### Let's Try Zipping Again

Right, so back to zipping: `[[A, B], [X, Y]] => { [A]: X, [B]: Y }`

```
function zip2Object<
  K0 extends string,
  K1 extends string,
  V0, V1
>(names: [K0, K1]): { [K0]: V0, [K1]: V1 };
function zip2Object(names: [string, string]): { [x: string]: any } {
  return {
    [names[0]]: null,
    [names[1]]: null,
  };
}
```

Almost.  We'd have to specify the type params for the values there.  Hm.  Can we defer that?

```
interface Zip2ObjectFactory<K0, K1> {
  <V0, V1>(v0: V0, v1: V1): { [K0]: V0, [K1]: V1 };
}

function createZip2Object<
  K0 extends string,
  K1 extends string
>(names: [K0, K1]): Zip2ObjectFactory<K0, K1>;
function createZip2Object(names: [string, string]): (...args: any[]) => { [x: string]: any } {
  return (...args) => ({
    [names[0]]: args[0],
    [names[1]]: args[1],
  });
}

const point = createZip2Object(['x', 'y']);
const p0 = point(10, 945);
```

Still not quite.  TS doesn't like the `[K0]` and `[K1]` expressions:

> A computed property name in a type literal must refer to an expression whose type is a literal type or a 'unique symbol' type.
>
> 'K0' only refers to a type, but is being used as a value here.

```
type Zip2ObjectFactory<K0, K1> =
  K0 extends string ? K1 extends string ? (
    <V0, V1>(v0: V0, v1: V1) => { [K0]: V0, [K1]: V1 }
  ) : never : never
  ;
```

Nope, same complaint.  Maybe I can get away with just dropping the type alias?

```
function createZip2Object<
  K0 extends string,
  K1 extends string
>(names: [K0, K1]): <V0, V1>(v0: V0, v1: V1) => { [K0]: V0, [K1]: V1 };
function createZip2Object(names: [string, string]): { [x: string]: any } {
  return (...args) => ({
    [names[0]]: args[0],
    [names[1]]: args[1],
  });
}

const point = createZip2Object(['x', 'y']);
const p0 = point(10, 945);
```

Strange.  Wonder why `K in UnionTypeOfStringConsts` works but just plain `SomeStringConst` doesn't?

Maybe if I try the tuple pack-unpack thing?

```
function createZip2Object<
  K0 extends string,
  K1 extends string,
  Ks extends [K0, K1]
>(names: [K0, K1]): <V0, V1>(v0: V0, v1: V1) => { [Ks[0]]: V0, [Ks[1]]: V1 };
function createZip2Object(names: [string, string]): { [x: string]: any } {
  return (...args) => ({
    [names[0]]: args[0],
    [names[1]]: args[1],
  });
}

const point = createZip2Object(['x', 'y']);
// :: <V0, V1>(v0: V0, v1: V1) => {}

const p0 = point(10, 945);
// :: {}
```

Nope, same thing.  Damn.  Can we not even box a value up?

```
function boxValue<K extends string, V>(k: K, v: V): { [K]: V } {
  return { [k]: v };
}

const bv = boxValue('v', 42);
// :: {}
```

I don't really have any more ideas, so I [asked the internet on StackExchange](https://stackoverflow.com/questions/51161567/given-tuple-type-of-string-constants-and-tuple-type-of-other-types-create-objec).

#### Update: An Answer!

[An answer has appeared!](https://stackoverflow.com/a/51161871/4084010)  That was pretty fast.  It combines use of the union-iteration (treating a type as a single-membered union with just itself) and intersection, specifically of objects.

```
function createZip2Object<
    K0 extends string,
    K1 extends string
>(names: [K0, K1]): <V0, V1>(v0: V0, v1: V1) =>
  { [P in K0]: V0 } & { [P in K1]: V1 };
function createZip2Object(names: [string, string]): { [x: string]: any } {
    return (...args: any[]) => ({
        [names[0]]: args[0],
        [names[1]]: args[1],
    });
}

const point = createZip2Object(['x', 'y']);
const p0 = point(10, 'may');
// :: { x: number } & { y: string }
```

Naturally, this results in a pretty funky looking type, but we get type checking and property hinting from VSCode, which are the main things we need.


### Bespoke Type Definitions

> Maybe I'll continue down this line?

We have a few general things, I think:

```js
interface TypeRep<Ts> {
  is(v: any): boolean;
  [K in keyof Ts]: TagConstructor<Ts[K]>;
}

interface TagConstructor<T> {
  ()
}

interface Tag<T> {
  toString(): string;
  [K in keyof T]: T[K];
}
```