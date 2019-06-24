Tips, Tricks, and Amusements in TypeScript
==========================================

Motley collection of things that I've learned while using TypeScript.



## Some General Advice

- To start, not all of these things are actually useful.  Note that "Amusements" appears in the title of this file.
- Remember that TypeScript is Structurally Typed.
    - Focus on the Structure, not on Names.
    - This is especially important with Conditional Types.
    - Also, don't constrain or conditionally-type what you don't care about.
    - If something seems like too much work or is killing the TS Server, consider if the types being used are too complicated and if there are too many indirections.
- Any Constraints to a Type Parameter must be satisfied in any usage of the Type containing that Parameter.
    - This is obvious, but also annoying if you overconstrain everything.
    - Also remember this if you have a type which uses another type that doesn't have a constraint and then try to use yet another type which does.
    - Conditional Types can in some situations be easier to use, then, where you can treat them as "lazy constraints".
- Object Literals default to having a type that is what is written.
- Array Literals default to an Array of a Union of the Default-Inferred Types of all members.
- The `object` builtin type is basically an alias for `{ [key: string]: any }` plus the Object Prototype Methods.  Don't use `object` unless you really mean `{ [key: string]: any }`.
    - In most cases, you probably mean one of these two things:
        - A specific Interface or Type Alias.
        - `{ [key: string]: SomeSpecificType }`



## Type Parameter Beholden to a Shape

Suppose you have a type `SomeShape<T>` that you want a type parameter beholden to, but you also need to pass that type parameter into `SomeShape<T>`.  Circular?  Sort of, but not technically.

With type parameters, you can apply constraints, usually in the form of `TFoo extends SomeShape<Other>` or `SomeShape<any>`.  You can also do `TFoo extends TFoo`, which will always pass because any type is an extension of itself, albeit one that doesn't really add/remove anything.

You can also put these together, saying things like `TFoo extends SomeShape<TFoo>`, which will constrain `TFoo` as more or less expected.  Naturally, `SomeShape<TFoo>` should reify to either something that then matches TFoo's shape (without recurring indefinitely), or to `never`, to tell TS what's not okay to reify to.

This is very useful for things like mapped-type configuration objects.

There's a limitation though: You can't have that type itself be a _conditional type_ on `T`, as that leads to a circular constraint.  That is, this is not allowed:

```typescript
type SomeShape<T> = T extends SomeShapeGeneral ? { [K in keyof T]: ShapeProp<T[K]> } : never;
function configureThing<
  // TS complains about circular constraint on TConfig.
  TConfig extends SomeShape<TConfig>
>(config: TConfig) {}
```

You can, however, still place ordinary (type-parameter) constrains on `T`:

```typescript
type SomeShape<T extends SomeShapeGeneral> = {
  [K in keyof T]: ShapeProp<T[K]>;
};

function configureThing<
  // TS complains about circular constraint on TConfig.
  TConfig extends SomeShape<TConfig>
>(config: TConfig) {}

```



## Functions that Operate on Objects and their Keys

You can constrain a function to operate on keys of an object by doing something like this:

```typescript
function getPropValue<TObject, TKey extends keyof TObject>(o: TObject, key: TKey) {
  return o[key];
}

function getPropValue<
  TObject,
  TKey extends Extract<keyof TObject>
>(o: TObject, key: TKey) {
  return o[key];
}
```

Note that we don't just given the parameter `key` a type of `keyof TObject`.  This is because we want `key` to be able to be a specific key, not just a union of all keys that `keyof TObject` is.



## Restricting Allowed Properties: Disallowing or Constraining

I tried a few things to restrict what propnames are allowed in a mapped type.

Suppose we have a function...

```typescript
function noFoos<T extends NoFooProp<T>>(t: T) {
    return t;
}
```

We want TypeScript to tell us this is bad:

```typescript
noFoos({ bar: true, foo: true });
```

Two things seemed to work:

```typescript
type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

// This works in function signatures as a type constraint
type NoFooProp<T> = {
    [K in keyof T]: K extends 'foo' ? never : T[K];
}

// Doesn't work; { foo: any } extends {}.
type NoFooProp2<T> = {
    [K in keyof Omit<T, 'foo'>]: T[K];
}

// Doesn't work... circular constraint.
type NoFooProp3<T> = T extends { foo: any } ? never : T;

// This works in function signatures as a type constraint
type NoFooProp4<T> =
    { [K in keyof Omit<T, 'foo'>]: T[K] } & { foo?: never };
```

Of these, `NoFooProp` seems to be the easiest to understand.  `NoFooProp4` works, and makes sense, but feels messier.  It also requires omitting some keys, which while functional makes the resultant types a mess more so than normal.

This only works of course in cases where you already have a type to play with, function arguments being one such case.  Placing internal structural constraints on TS structural types really seems to depend on functions and classes.

Anyway, this same trick can be used of course for anything else: Suppose you have a special name reserved for config?  Remember, that `never` is just another type, albeit one that has special meaning.

```typescript
type SpecialConfig<T> = {
  [K in keyof T]: (
    K extends 'forbidden' ? never :
    K extends '$config' ? ConfigProp<T[K]> :
    OtherPropDef<T[K]>
  );
};
```

You can also exclude or define many specific props at once:

```typescript
type SpecialConfig<T> = {
  [K in keyof T]: (
    K extends 'forbidden' | 'alsoForbidden' | 'stillForbidden' ? never :
    K extends '$config' ? ConfigProp<T[K]> :
    OtherPropDef<T[K]>
  );
};
```


### Bonus: Requiring Props

There is actually a case where you may need to use the intersection trick: If you want to require a certain prop.

Take the config above: Suppose we require the user specify `$config` on there?

```typescript
type SpecialConfig<T> = {
  [K in keyof T]: (
    K extends 'forbidden' ? never :
    K extends '$config' ? ConfigProp<T[K]> :
    OtherPropDef<T[K]>
  );
} & {
  // You must include some sort of prop `$config`.
  // I don't care what it is, but my buddy before me does.
  $config: any
};
```

Sure, it's an `any`, the devil itself, but while `number & any` may result in `any`, `{ foo: number } & { foo: any }` does not.  Instead, TS seems to check if the type matching against that one has a property `foo` and if the value-type on property `foo` matches both `number` and `any`, rather than checking if it matches `number & any`.

You might wonder if you can just do something like this:

```typescript
type RequireBaz<T extends { baz: string }> = {
    [K in keyof T]: (
        K extends 'baz' ? string : number
    );
};

function needMeSomeBaz<T extends RequireBaz<T>>(t: T) {
    return t;
}

needMeSomeBaz({ foo: 2, baz: '54' });
```

I tried that, but the function call doesn't require `baz`, and worse, TS complains that the `T` in `RequireBaz<T>` doesn't fit the constraint `{ baz: string }`, which it very well might not.  However, it believes the problem lies in the type parameter itself rather than what ever might be populating that parameter.



## Local/Scoped Types

You can define interfaces and type aliases local a block or function body, which is handy when you want to have type aliases for long drawn out definitions that are reused through out a function or if or loop block.

```typescript
function foo<TFoo>(f: TFoo) {
  type Boxed = { foo: TFoo };
  return { foo: TFoo } as Boxed;
}

// Cannot find name 'Boxed'
type b: Boxed = foo(42);

for (let i = 0; i < 10; ++i) {
  // gives { beep: number } because 'i' changes from iteration to iteration.
  type Beep = { beep: typeof i };
}

// Cannot find name 'Beep'
type beep: Beep = { beep: 5 };
```

While I'm not sure how useful it is in loops, it's immensely useful for DRYing types in functions.  The only time it's not useful is for specifying the return type of a function... A shame, really.



## Working With Exact Shapes or Specific Values

You can use a type constraint as a way interacting with more specific types rather than more general types.

For instance, if you use a naive approach to a pair-creating function, you'll get something too generic to really use:

```typescript
function pair<K, V>(s: K, v: V): [K, V] {
    return [s, v]
}

// :: [string, number]
const pair0 = pair('a', 5)
```

It might be what you want, but maybe you want to have the exact key instead of just `string`?  This is doable by specifying that `K extends string` rather than, well, not doing that.

```typescript
function keyValuePair<K extends string, V>(k: K, v: V): [K, V] {
    return [k, v]
}

// :: ["a", number]
const pair1 = keyValuePair('a', 5)
```

You might wonder if `K extends any` also works, but `any` is too broad, you'll get just the generic type.

```typescript
function anyKeyValuePair<K extends any, V>(k: K, v: V): [K, V] {
    return [k, v]
}

// :: [string, number]
const pair2 = anyKeyValuePair('a', 42)
```

You can get somewhat the way there by using a union of narrower types, though:

```typescript
function unionKeyValuePair<K extends string | number | boolean, V>(k: K, v: V): [K, V] {
    return [k, v]
}

// :: ["a", number]
const pair3 = unionKeyValuePair('a', 3)
// :: [true, number]
const pair4 = unionKeyValuePair(true, 5)
```



## Getting a Key-Value-Associated Union from a Map-Object Type, e.g. Key-Value Pairs

Suppose we have a type like this:

```typescript
const mapOfFns = {
    five: () => 5,
    double: (x: number) => x * 2,
    greet: (name: string) => `Hello, ${name}!`,
};

// :: { five(): number; double(x: number): number; greet(name: string): string; }
type MapOfFns = typeof mapOfFns;
```

And we want to get this:

```
type UnionOfPairs = ['five', () => number] | ['double', (x: number) => number] | ['greet', (name: string) => string]
```

We need to both take advantage of the distribution of Unions across other types, while at the same time locking each Union member down.  To do this, we can use the old `K extends string` trick to pin a given Union member, and then use that to extract the value from the Map Type based on the pinned Union member.  At least, that's how I think about it.

Here's probably the tightest solution:

```typescript
type Pairs<TMap> = ExtractPairs<TMap, keyof TMap>;

type ExtractPairs<TMap, TKey extends keyof TMap> =
    TKey extends string ? [TKey, TMap[TKey]] : never;
```

And here's one that technically isn't as tight, but is practically speaking more than good enough since you can only specify a subset of keys, never a superset, for `TKey`:

```typescript
type Pairs<TMap, TKey extends keyof TMap = keyof TMap> =
    TKey extends string ? [TKey, TMap[TKey]] : never;
```

In either case, you can then replace `[TKey, TMap[TKey]]` with anything you like!  For instance...

```typescript
type Dispatches<TMap, TKey extends keyof TMap = keyof TMap> =
    TKey extends string ? DispatchOfPair<TKey, TMap[TKey]> : never;

type DispatchOfPair<TKey, TFn> =
    TFn extends (...args: infer TArgs) => infer TReturn
    ? TArgs extends any[]
        ? (key: TKey, ...args: TArgs) => TReturn
        : never
    : never
    ;
```

Man, if we had higher order types, we could totally wrap that around any type specifier that takes a Key type and a Value type... Pretty sure the TS team isn't interested in that, though.



## Interfaces: Class Constructors, Optionally With Prototypes

> For more on this topic, see [the handbook](http://www.typescriptlang.org/docs/handbook/interfaces.html#class-types).

You can define an interface for Class Constructors by defining a `new` "method" in your interface:

```typescript
interface FrangibleContext {
    foo: string;
    bar: number;
}

// We can accept any _class_ whose constructor
// follows the given interface.
interface FrangibleClass {
    // NOTE: no return type!
    new(context: FrangibleContext);
}

class Foo {
    constructor(protected context: FrangibleContext) {}
}

class Bar {
    constructor(protected context: FrangibleContext) {}
}

const things: FrangibleClass[] = [Foo, Bar];
```

Nothing exciting, but you can also type the prototype...

```typescript
interface FrangibleContext {
  foo: string;
  bar: number;
}

// We can accept any _class_ whose constructor
// follows the given interface.
interface FrangibleClass {
  // NOTE: no return type!
  new(context: FrangibleContext);
  prototype: {
    op(s: string): string;
  };
}

class Foo {
  constructor(protected context: FrangibleContext) { }
  op(s: string): string {
    return `foo ${this.context.foo}: ${s}`;
  }
}

class Bar {
  constructor(protected context: FrangibleContext) { }
  op(s: string): string {
    return `bar ${this.context.bar}: ${s}`;
  }
}

const things: FrangibleClass[] = [Foo, Bar];
```

Note that this type about the Class, not the Instance, so you can't say `Foo extends FrangibleClass` here.
