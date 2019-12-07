Journal 2019-12-06 - Util Function - Record of Keys and Mapped Values
=======

A not-uncommon pattern is to create a record given an array of keys and the result of mapping each of those keys to some sort of value.  It can be implemented with a simple for-each loop or reduce operation, but the function could give a better name to it:

```typescript
function recordOfKeysAndMappedValues<
  TKeys extends string | number | symbol,
  TValues
>(
  keys: TKeys[],
  mapFn: (key: TKeys) => TValues
): Record<TKeys, TValues> {
  return keys.reduce(
    (acc, next) => {
      acc[next] = mapFn(next);
      return acc;
    },
    {} as Record<TKeys, TValues>
  );
}
```

As an example:

```typescript
type KS = 'foo' | 'bar' | 'baz';

const ks: KS[] = ['foo', 'bar', 'baz'];
const ksToUks = {
  foo: 'FOO',
  bar: 'BAR',
  baz: 'BAZ',
} as const;

// :: Record<KS, 'FOO' | 'BAR' | 'BAZ'>
const obj = recordOfKeysAndMappedValues(ks, k => ksToUks[k]);
```

The only reason the value-type is so specific is because I used an `as const` on the object.  Usually it'll be some generic thing, frequently `boolean` in my case.
