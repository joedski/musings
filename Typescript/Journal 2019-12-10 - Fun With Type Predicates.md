Journal 2019-12-10 - Fun With Type Predicates
========

Using the `arg is Type` return type, you can define a type predicate.  It's important to note that `Type` in there is any valid type expression...



## Predicate on Property Types

You could use this, for instance, to predicate some logic branch upon many properties being not-null:

```typescript
type ObjectWithNotNullableKeys<
    T extends Record<string | number | symbol, any>,
    KS extends keyof T
    > = T & {
        [K in KS]: Exclude<T[K], null>
    };

function propsNotNull<
    T extends Record<string | number | symbol, any>,
    KS extends keyof T
>(target: T, keys: readonly KS[]): target is ObjectWithNotNullableKeys<T, KS> {
    return keys.every(key => target[key] != null);
}
```

```typescript
interface Foo {
    foo: string | null;
    bar: number | null;
}

const foo: Foo = { foo: 'yay', bar: null };

if (propsNotNull(foo, ['foo', 'bar'])) {
    console.log('we have foo.foo!', foo.foo.toUpperCase());
    console.log('also bar!', foo.bar.toFixed(2));
} else {
    console.log('we do not have foo.foo :(', foo.foo, '(it might be null for all we know)');
}
```

If you wanted to be more flexible, you could say `Exclude<T[K], null | void>`.  Makes it sound more legalesish, too.



## Predicate On Array Of Type

Or how about given one predicate, creating another predicate for array-of-type things?

```typescript
function isArrayOf<T, TNarrowed extends T>(
    array: readonly T[],
    elemPredicate: (value: T) => value is TNarrowed
): array is TNarrowed[] {
    return array.every(elem => elemPredicate(elem));
}
```

> NOTE: `readonly T[]` is used instead of just `T[]` because `T[] extends readonly T[]`, but not vice versa.

Works for simple cases:

```typescript
function isString(value: unknown): value is string {
    return typeof value === 'string';
}

const arr: unknown[] = ['foo', 'bar', 'baz'];
if (isArrayOf(arr, isString)) {
    // value here properly has the type `string`.
    arr.forEach(value => console.log(value.toUpperCase()));
}
```

How about more complex ones?  Barrowing the types and predicate from the previous section...

```typescript
const arr2: Foo[] = [
    { foo: 'yay', bar: 1 },
    { foo: 'foo', bar: 2 },
];

// Argument of type '(el: Foo) => boolean' is not assignable to parameter of type '(value: Foo) => value is Foo'.
//   Signature '(el: Foo): boolean' must be a type predicate.
if (isArrayOf(arr2, el => propsNotNull(el, ['foo', 'bar']))) {
    // ...
}
```

I guess it doesn't propagate predicate returns up.  Hm.  Have to wrap it then, I suppose.

```typescript
// :: function propsNotNullPred<KS extends string | number | symbol>(keys: readonly KS[]): <T extends Record<KS, any>>(target: T) => boolean
function propsNotNullPred2<KS extends string | symbol | number>(keys: KS[]) {
    return <T extends Record<KS, any>>(target: T) => propsNotNull(target, keys);
}
```

Yep, just returns a function returning boolean.  Boo.  Have to actually specify the return type:

```typescript
function propsNotNullPred<KS extends string | symbol | number>(keys: readonly KS[]) {
    return function pred<T extends Record<KS, any>>(target: T): target is ObjectWithNotNullableKeys<T, KS> {
        return propsNotNull(target, keys);
    };
}
```

But that does work:

```typescript
if (isArrayOf(arr2, propsNotNullPred(['foo']))) {
    arr2.forEach(el => {
        console.log('we have not-null foo!', el.foo.toUpperCase());
        console.log(
            'Not not-null bar, though, because we didn\'t check',
            el.bar != null ? el.bar.toFixed(2) : '(null)'
        );
    })
}
```

Modified rapture.

Perhaps then predicates should always be written in such a form as to either be or create a function which has just a single value parameter, and that further parametrization should be done via an outer function.

That is, generally, either `el => el is T` or `config => el => el is T`.  Otherwise, the predicate just gets subsumed into a generic `boolean` return type which is entirely not the point of having predicates.



## Running Rampant With Predicates

One thing that's annoying is to validate that some random value is (assignable to) an object-type.  You have to check that every single property on it is of some specific type.

By building higher-order predicates like the Array-of-Type one shown above, this can be made somewhat less annoying.



## More Recent News

Couple of things I noticed since I last played with this:

- `Array.prototype.every()` has an overload for type predicates!  I don't know how long that's been there but noice.
- Still no automatic type predicate inferrence from functions whose return values are just type predicates.  Bah.

Anyway, that means we can literally use built in methods for array stuff:

```typescript
interface Foo {
    name: string;
    value: string;
}

// boo, I still need to specify return type.
function isFoo(value: unknown): value is Foo {
    return isObject(value) && hasProperties(value, {
        name: isString,
        description: isString,
    });
}

// yay!
if (Array.isArray(value) && value.every(isFoo)) { ... }
```

These are done with the following:

```typescript
function isString(value: unknown): value is string {
    return typeof value === 'string';
}

type PredicatesFromProperties<TProps> = {
    [K in keyof TProps]: (value: unknown) => value is TProps[K];
};

function hasProperties<
    TValue extends object,
    TProps extends Record<string | symbol | number, any>
>(
    // Partial<> is used here because we shouldn't allow existing properties
    // unless they match the predicates.
    value: TValue & Partial<TProps>,
    propertyPredicates: PredicatesFromProperties<TProps>
): value is TValue & TProps {
    const properties = Object.entries(propertyPredicates);
    return properties.every(
        ([property, predicate]) => predicate(value[property])
    );
}
```
