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
>(target: T, keys: KS[]): target is ObjectWithNotNullableKeys<T, KS> {
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
