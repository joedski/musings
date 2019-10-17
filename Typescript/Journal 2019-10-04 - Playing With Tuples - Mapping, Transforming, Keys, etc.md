Journal 2019-10-04 - Playing With Tuples - Mapping, Transforming, Keys, etc
=======



## Can I Get Just the Indices?

> Summary: Yes:
>
> ```typescript
> type TupleIndices<T extends any[]> = { [K in keyof T]: K }[number];
> ```

Well, this is doable through a bit of jiggery-pokery.  Probably.  Basically, since a tuple is a sort of fixed Array type, you have `TArr[number]` still available to get the type of any element.  However, fixed keys of a Tuple are still strings, `"0" | "1" | ...`, so if you limit the keys to `TTuple[TKeys] extends TTuple[number]`, then just `Extract<TKeys, string>`, you get back only those keys which result in element types.

Suppose a tuple like this:

```typescript
type SomePairs = [
    ['foo', string],
    ['bar', number],
];

// ["foo", string]
type P0 = SomePairs[0];
// ["bar", number]
type P1 = SomePairs[1];
```

I can get the keys of that like this:

```typescript
// "0" | "1"
type SomePairsKeys =
    keyof SomePairs extends infer TKeys ?
    TKeys extends keyof SomePairs ?
    SomePairs[TKeys] extends [string, any] ?
    Extract<TKeys, string> : never : never : never;
```

Of course, we can get `[string, any]` or something just as good if not better by just doing `SomePairs[number]`.  That suggests something like:

```typescript
type TupleIndices<TTuple extends any[]> =
    keyof TTuple extends infer TKeys ?
    TKeys extends keyof TTuple ?
    TTuple[TKeys] extends TTuple[number] ?
    Extract<TKeys, string>
    : never
    : never
    : never;
```

That seems to work at first:

```typescript
// "0" | "1"
type SomePairsKeys1 = TupleIndices<SomePairs>;
```

But runs into some edge cases:

```typescript
type TupleWithArrayMethods = [
    Array<any>['filter'],
];

// "filter" | "0" | "reverse" | "map" | "find"
type SomePairsKeys2 = TupleIndices<TupleWithArrayMethods>;
```


### Another Tack: Temporary Mapped Types

Since TypeScript 3.1 we've been able to [use mapped types with tuples and arrays](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-1.html#mapped-types-on-tuples-and-arrays) to get the expected results.  Instead of depending on the things inside, maybe we could just map it to some fixed value and use that?

```typescript
type TupleIndices<TTuple extends any[]> =
    keyof TTuple extends infer TKeys ?
    TKeys extends keyof TTuple ?
    { [K in keyof TTuple]: ':D' }[TKeys] extends ':D' ?
    Extract<TKeys, string>
    : never
    : never
    : never
    ;
```

This looks promising:

```typescript
type SomePairs = [
    ['foo', string],
    ['bar', number],
];

// "0" | "1"
type SomePairsKeys1 = TupleIndices<SomePairs>;

type TupleWithArrayMethods = [
    Array<any>['filter'],
];

// "0"
type SomePairsKeys2 = TupleIndices<TupleWithArrayMethods>;
```

So that might be a good place to start.


### A Simpler Tack: About That Mapped Type

Coming back to this later, we don't even need to do any of that.  Rather, just make the mapped type but rather than using any value, just use the key.  The main thing is that _we need to have a type variable that extends `any[]`, rather than possibly being any old object_.  That's the key.

```typescript
type TupleIndices<T extends any[]> = { [K in keyof T]: K }[number];

type SomePairs = [
    ['foo', string],
    ['bar', number],
];

// "0" | "1"
type SomePairsKeys1 = TupleIndices<SomePairs>;
```



## Pairs-Tuple to Object

> TL;DR: The solution is simpler than I thought, and doesn't even require indices at all.  [See below](#pairs-tuple-to-object-simplest-form)

The entire reason I want to get indices is that I want to create an object from a set of pairs.

Not quite sure how to work that yet, since we can't exactly do a straight up mapped type: We're trying to go from index-referenced const string types (the pair-tuples (duples) within the pairs-collection tuple) to property names on objects.

```typescript
type ObjectFoo = { foo: string };
type ObjectBar = { bar: number };

// A basic intersection works, but is kinda ugly.
type ObjectFooBarIntersection = ObjectFoo & ObjectBar;
// A mapped type is prettier, but can result in hard to read type errors later.
type ObjectFooBarMapped = {
    [K in keyof (ObjectFoo & ObjectBar)]: (ObjectFoo & ObjectBar)[K];
};
// Not allowed: base type must be an object type.  Intersections of objects are not considered objects.
// interface ObjectFooBarExtended extends ObjectFoo & ObjectBar {}
```

Given that I can now (probably) dependably get the indices of a tuple type, I should be able to combine that with intersection of created object types... I think.  I'd have to go from a union to an intersection.  Hmmm.  Or, would I?


### Get Index of Key of Pair

While other generalisms are nice, in this specific case I want to get the index of a key of a pair.

```typescript
type AnyPairs = [string, any][];
```

And of course, we'll see the expected types if we drill down:

```typescript
// [string, any];
type AnyPair = AnyPairs[number];
// string;
type AnyKey = AnyPair[0];
```

Sure.  So, how about the SomePairs above?  Can we go from `"foo"` to `"0"`?

```typescript
type SomePairs = [
    ['foo', string],
    ['bar', number],
];

// "0"
type IndexOfFooPair =
    keyof SomePairs extends infer TIndex ?
    TIndex extends TupleIndices<SomePairs> ?
    SomePairs[TIndex][0] extends 'foo' ?
    TIndex
    : never : never : never;
```

That seems trivial to generalize, then:

```typescript
type IndexOfPairKey<TPairs extends [string, any][], TKey extends string> =
    keyof TPairs extends infer TIndex ?
    TIndex extends TupleIndices<TPairs> ?
    TPairs[TIndex][0] extends TKey ?
    TIndex
    : never : never : never;
```

Not quite.  Getting an error on the `TPairs[TIndex][0] extends ...` part.  Let's try just making an inline pair type, then:

```typescript
type IndexOfPairKey<TPairs extends [string, any][], TKey extends string> =
    keyof TPairs extends infer TIndex ?
    TIndex extends TupleIndices<TPairs> ?
    TPairs[TIndex] extends [TKey, any] ?
    TIndex
    : never : never : never;

// "0"
type IndexOfFooPair1 = IndexOfPairKey<SomePairs, 'foo'>;
// "1"
type IndexOfBarPair1 = IndexOfPairKey<SomePairs, 'bar'>;
```

So far so good.

```typescript
type ObjectOfPairs<TPairs extends [string, any][]> = {
    [TKey in Extract<TPairs[number]['0'], string>]:
        TPairs[IndexOfPairKey<TPairs, TKey>] extends [TKey, infer TValue] ? TValue : never;
};

// { foo: string; bar: number; }
type SomePairsObject = ObjectOfPairs<SomePairs>;
```

Hey, there we go.


### Do We Actually Need Indices?

I wonder if we even need the indices, looking at that?

```typescript
type ObjectOfPairs<TPairs extends [string, any][]> = {
    [TKey in Extract<TPairs[number][0], string>]:
        TPairs[number] extends [TKey, infer TValue] ? TValue : never;
};

// { foo: never; bar: never; }
type SomePairsObject1 = ObjectOfPairs<SomePairs>;
```

<a id="pairs-tuple-to-object-simplest-form"></a>Er, no.  Looking at that again, that makes sense: `TPairs[number]` is, in the `SomePairs` case, `["foo", string] | ["bar", number]` which is not assignable to a specific case of `["foo", string]`.  What we want there is an extraction, instead:

```typescript
type ObjectOfPairs<TPairs extends [string, any][]> = {
    [TKey in Extract<TPairs[number][0], string>]:
        Extract<TPairs[number], [TKey, any]>[1];
};

// { foo: string; bar: number; }
type SomePairsObject1 = ObjectOfPairs<SomePairs>;
```

Turns out it's even simpler than I thought.  Nice.

Obviously, that still requires a tuple type, so any literal values in JS land are going to have to be cast with `as const` or entered with a function that explicitly creates a tuple, but that was always the case.
