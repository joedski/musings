Tips, Tricks, and Amusements in TypeScript
==========================================

Motley collection of things that I've learned while using TypeScript.



## Type Parameter Beholden to a Shape

Suppose you have a type `SomeShape<T>` that you want a type parameter beholden to, but you also need to pass that type parameter into `SomeShape<T>`.  Circular?  Sort of, but not technically.

With type parameters, you can apply constraints, usually in the form of `TFoo extends SomeShape<Other>` or `SomeShape<any>`.  You can also do `TFoo extends TFoo`, which will always pass because any type is an extension of itself, albeit one that doesn't really add/remove anything.

You can also put these together, saying things like `TFoo extends SomeShape<TFoo>`, which will constrain `TFoo` as more or less expected.  Naturally, `SomeShape<TFoo>` should reify to either something that then matches TFoo's shape (without recurring indefinitely), or to `never`, to tell TS what's not okay to reify to.

This is very useful for things like mapped-type configuration objects.

There's a limitation though: You can't have that type itself be a _conditional type_ on `T`, as that leads to a circular constraint.  That is, this is not allowed:

```js
type SomeShape<T> = T extends SomeShapeGeneral ? { [K in keyof T]: ShapeProp<T[K]> } : never;
function configureThing<
  // TS complains about circular constraint on TConfig.
  TConfig extends SomeShape<TConfig>
>(config: TConfig) {}
```

You can, however, still place ordinary (type-parameter) constrains on `T`:

```js
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

```js
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



## Restricting Allowed Properties: Disallowing or Constraining

I tried a few things to restrict what propnames are allowed in a mapped type.

Suppose we have a function...

```js
function noFoos<T extends NoFooProp<T>>(t: T) {
    return t;
}
```

We want TypeScript to tell us this is bad:

```js
noFoos({ bar: true, foo: true });
```

Two things seemed to work:

```js
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

```js
type SpecialConfig<T> = {
  [K in keyof T]: (
    K extends 'forbidden' ? never :
    K extends '$config' ? ConfigProp<T[K]> :
    OtherPropDef<T[K]>
  );
};
```

You can also exclude or define many specific props at once:

```js
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

```js
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

```js
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
