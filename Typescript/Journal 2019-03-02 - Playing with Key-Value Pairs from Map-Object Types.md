Journal 2019-03-02 - Playing with Key-Value Pairs from Map-Object Types
=======================================================================

> I've saved a shorter summary of findings in my [Tips, Tricks, and Amusements file](./Tips%2C%20Tricks%2C%20and%20Amusements.md).

I'll use a simple example here:

```typescript
const mapOfFns = {
    five: () => 5,
    double: (x: number) => x * 2,
    greet: (name: string) => `Hello, ${name}!`,
}

type DispatchOfMap<
    TMap extends { [key: string]: Function },
    TKey extends Extract<keyof TMap, string> = Extract<keyof TMap, string>
> = DispatchOfPair<TKey, TMap[TKey]>;

type DispatchOfPair<TKey extends string, TFn extends Function> =
    TFn extends (arg: infer TArg) => infer TReturn
    ? (key: TKey, arg: TArg) => TReturn
    : TFn extends () => infer TReturnNoArg
    ? (key: TKey) => TReturnNoArg
    : never
    ;

type FnsDispatch = DispatchOfMap<typeof mapOfFns>;
```

That's not quite working... What would be the simplest case?  I guess taking some type `T extends { [key: string]: any }` and getting `[TKey0, T[TKey0]] | [TKey1, T[TKey1]] | ...` since then we could theoretically manipulate things after that.  What I really need is `TElem in TUnion` but outside of mapped object types...

Okay, taking a break to look at [other peoples' work](https://stackoverflow.com/questions/51691235/typescript-map-union-type-to-another-union-type), I see something like this should do the trick:

```typescript
const mapOfFns = {
    five: () => 5,
    double: (x: number) => x * 2,
    greet: (name: string) => `Hello, ${name}!`,
}

// type Pairs<TMap> =
//     TMap extends { [key: string]: any }
//     ? ExtractPairs<TMap, keyof TMap>
//     : never
//     ;
// This seems to work just as well, just need the other type to do the whole union-distribution thing.
type Pairs<TMap> = ExtractPairs<TMap, keyof TMap>;

type ExtractPairs<TMap, TKey extends keyof TMap> =
    TKey extends string ? [TKey, TMap[TKey]] : never;

type MapOfFnsPairs = Pairs<typeof mapOfFns>;
// :: ['five', () => number] | ['double', (x: number) => number] | ['greet', (name: string) => string]
```

Indeed, it does.  Excellent.  We should be able to replace that `[TKey, TMap[TKey]]` with any type we like.

I was even able to whittle things down to just this, which should be tight enough since you could only specify a `TKey` that's either the same as the default value or tighter:

```typescript
type Pairs<TMap, TKey extends keyof TMap = keyof TMap> =
    TKey extends string ? [TKey, TMap[TKey]] : never;

type MapOfFnsPairs = Pairs<typeof mapOfFns>;
// :: ['five', () => number] | ['double', (x: number) => number] | ['greet', (name: string) => string]
```

With all that, then, we have something like this:

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

Eet verks.  Also, inferrence of rest args, hell yeah.
