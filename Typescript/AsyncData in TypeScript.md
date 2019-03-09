AsyncData in Typescript
=======================

I wanted to do the equivalent of [this pattern](https://medium.com/javascript-inside/slaying-a-ui-antipattern-in-react-64a3b98242c) in a Typescript project, but [daggy](https://github.com/fantasyland/daggy) doesn't have Typescript types, and honestly I'm not sure how to strongly specify how it would work.  Lots of `keysof` and such, but the biggest thing is I don't know how to take a tuple of strings and use that to specify object properties, which is one of the main parts of daggy's interface.

Since I need this sooner than later, I'll just try implementing a bespoke thing.



## Try 1: Objects and Functions

My first thought is to just use objects and functions, because they are clearly superior to classes.  The [implementation I came up with](./AsyncData%20in%20TypeScript%20Examples/objects-and-functions.ts) was noisier, though, so in this case my assertion of superiority was not so correct.



## Try 2: Classes

I'm nothing if not pragmatic.  I figured there must be an easier way to do it.  The tagged types in daggy are basically subclasses of the sum type, so I figured I could engage in some "class extends base" work.  The [implementation I came up with using classes](./AsyncData%20in%20TypeScript%20Examples/classes.ts) came out much cleaner than the other one.  Oh well.

It also allows method-chaining, which is okay, but not as nice as plain function composition or flowing.  Oh well, it's JS not OCaml.  Shame we don't have an official bind operator, nor a pipe operator.

For the most common case, we get a very javascripty look:

```js
enhancedFetch(apiRequests.thingy(thingyId))
  .then(res => res
    .map(data => notify({
      ...
    }))
    .mapError(error => {
      const message = (() => {
        if (error instanceof Response) {
          return 'Some server error';
        }
        if (error instanceof Error) {
          return error.message;
        }
        return 'Some unknown error';
      })();

      notify({
        ...
      });
    })
  );
```



## Try 3: Classes with Abstract Methods

The idea behind this is to avoid reliance on `instanceof`, which is easily fooled.  I doubt it would be fooled in this limited case since, if you're doing tricky things, you're shooting yourself in the foot, but hey, I need to explore the possibility.

Basically, instead of having the cases all shown in the base method implementations, any methods dependent on the concrete class of the instance should have their specific behavior implemented in those derivative concrete classes.  This gives us two things:
- Specific behavior defined at the most meaningful point, at the cost of having it spread across definitions.
- No need to manually throw errors to avoid non-exhaustive checks.  Instead, the use of abstract methods will do that for us, whether by not even implementing something or by having an error-throwinwg-method automatically created.

The primary downside of this is that we have to duplicate the method type definitions for every implementation.  Very annoying.  Technically correct, but very verbose.  Not sure if that's fine or not, it does make it harder to read and update, though.



## TS 3 Updates

It seems the team has been busy tightening restrictions up.  Particularly, I'm getting errors about use of variables before they're declared.  I think this is mostly down to trying to use the concrete classes before they're created, which is a problem when defining methods on the base abstract class that depends on their existence.

I ended up going whole hog on the `classes-with-abstract-methods` way, just implementing the specific behavior in each sub class and living with the (slightly) duplicated method interfaces.  This also avoids the [empty class funniness](https://github.com/Microsoft/TypeScript/wiki/FAQ#why-do-these-empty-classes-behave-strangely) that caused type-narrowing to narrow `this` to `never`.  It's ugly because the implementation of each method is spread across all the concrete case-classes, but whatever.  It works, typechecks, and is explicit so I guess that's good enough.  It makes everything look like Java, though, which skeeves me out for purely personal and irrational reasons.



## Other Thoughts


### Run-Time Type Checking

Neither implementation includes the ability to check types separately and, for the use cases I'm considering, I don't think that's really necessary.  Every case is better handled with `inst.cata()`.  (Except those better handled with `.map()` because you only need to change the success case.)

On the other hand, if I just attached the class constructors directly to `AsyncData`, then I could just define `is` on them directly, or users could just use `instanceof` to check if the types are as described.

#### A Case For Run-Time Checking

Currently, things like `map` (really `fmap`) only deal with the Result case since that's the most common.  However, we might want to, say, specify which things are loading exactly.  In this case, type checking is actually handy since we can then say things like:

```js
const itemsWaitingOn = Object.entries({ dataFoo, dataBar, dataBaz })
.filter(([, data]) => AsyncData.Waiting.is(data))
.map(([key]) => key)

console.log('Still waiting on', itemsWaitingOn.join(', '))
// => e.g. "Still waiting on dataFoo, dataBaz"
```

Writing that out with cata, while certainly doable and technically correct, is annoying:

```js
const itemsWaitingOn = Object.entries({ dataFoo, dataBar, dataBaz })
.filter(([, data]) => data.cata({
  NotAsked: () => false,
  Waiting: () => true, // this one.
  Error: () => false,
  Result: () => false,
}))
.map(([key]) => key)
```

Still, `cata` is the recommended function while rendering.


### The Component Enhancer

This is a pretty big topic, so I've moved everything to another journal: [AsyncData in Typescript - Component Enhancer](./AsyncData%20in%20Typescript%20-%20Component%20Enhancer.md)


### Revisiting with TS 3

TS 3 has [generic rest parameters that can be inferred to tuple types as well as 0-length tuples](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-0.html#generic-rest-parameters).  This is part of the way to generally manipulating function argument types, with the [mapping side of the story coming soon](https://github.com/Microsoft/TypeScript/pull/26063).  I think this should be doable somewhat soonish.

```ts
type TaggedSumDefMap<T> = {
  [K in Extract<keyof T, string>]: TaggedSumDefMapArgsTuple<T[K]>;
};

// [string, string, string] rather than ['x', 'y', 'z'].
// This is why we need mapped tuple types.
type TaggedSumDefMapArgsTuple<T extends any[]> = T;

declare function taggedSum<
  TRepName extends string,
  TSumDefMap extends TaggedSumDefMap<TSumDefMap>,
>(repName: TRepName, defMap: TSumDefMap): TaggedSum<TRepName, TaggedTypesOfDefMap<TSumDefMap>>;

// We're still missing the types for each constructor's arguments.
// How could we add that information purely through types without
// creating actual implementation?
```

We could get around in some specific cases the lack of mapped tuple types:

```ts
type TaggedSumDefMapArgsTuple<T extends any[]> =
  T extends [] ? [] :
  T extends [infer A0] ? [ConstString<A0>] :
  T extends [infer A0, infer A1] ? [ConstString<A0>, ConstString<A1>] :
  // ... etc.
  never;

type ConstString<T> = T extends string ? T : never;
```

But then we have to do similarly to get them out.

Still, I wonder if we could then do something like this:

```ts
const AsyncData = daggy.taggedSum('AsyncData', {
  NotAsked: [],
  Waiting: [],
  Error: ['error'],
  Result: ['result'],
}) & TaggedSumMemberTypes<{
  NotAsked: [],
  Waiting: [],
  Error: [unknown],
  Result: [unknown],
}>;
```

Not entirely sure what to do about the type parametrization...  I guess we'd say something like "This is an `AsyncData.Error<[Error]>(error)`" or the like.  Or just infer it from the call?  Hm.

Obviously the `AsyncData.Error` instances would be `{ [whateverTagProp]: 'Error' } & { error: T }`, however `T` gets in there.

I suppose if you could constrain the functions like this:

```ts
type TaggedSumConstructor<TMemberNames extends any[], TMemberTypes extends any[]> =
  TMemberTypes extends []
  ? () => {}
  : ZipTuplesToObject<TMemberNames, TMemberTypes> extends {
    [infer MK0]: infer SMV0;
  }
  ? <MV0 extends SMV0>(mv0: MV0) => {
    [MK0]: MV0;
  }
  : ZipTuplesToObject<TMemberNames, TMemberTypes> extends {
    [infer MK0]: infer SMV0;
    [infer MK1]: infer SMV1;
  }
  ? <MV0 extends SMV0, MV1 extends SMV1>(mv0: MV0, mv1: MV1) => {
    [MK0]: MV0;
    [MK1]: MV1;
  }
  // ...
  : never
  ;
```

Hmm.  This might have to wait for mapped tuple types.

Something like this, I guess?

```ts
type TaggedSumConstructorMember<TZipped extends any[]> = {
  [I in keyof TZipped]:
    TZipped[I] extends [infer TKey, infer TValueType]
    ? TKey extends string ? { [TKey]: TValueType }
    : never : never;
}
```

Hm.  Not quite.  What am I trying to do with that?



## POJOs + Functions?

Two things in Typescript have a lot of nice type usage characteristics: Classes and Functions.  I've looked at the above before, but Daggy itself tends to operate in a very Function-oriented manner.  A PR I submitted even removed some uses of `this` because of Opinions (that I happened to agree with).

What might this look like?  I expect a Namespace that acts as the "base type", a Union to act as the "enum" (because Tagged Sums are Better Enums), and of course functions to act upon those types.

I think the intended interface might look something like this:

```typescript
import maybe from '@/util/maybe';
const someMaybeValue: maybe.Maybe<boolean> = maybe.Just(true);
const someResult = maybe.cata(someMaybeValue, {
    Nothing: () => 'Absolutely nothing!',
    Just: (value: boolean) => `It's just ${value}!`,
});
if (maybe.Just.is(someMaybeValue)) {
    console.log('The value is some value!');
}
```

```typescript
export type Maybe<T> = { '@sum': 'Maybe' } & (
  { '@tag': 'Nothing', '@values': [] }
  | { '@tag': 'Just', '@values': [T] }
);

export function Just<T>(value: T): Maybe<T> {
  return { '@sum': 'Maybe', '@tag': 'Just', '@values': [value] };
}

export function Nothing(): Maybe<void> {
  return { '@sum': 'Maybe', '@tag': 'Nothing', '@values': [] };
}

export function cata<T, TCatas extends AnyCatasOf<Maybe<T>> = AnyCatasOf<Maybe<T>>>(inst: Maybe<T>, catas: TCatas): AnyCataHandlerReturnType<TCatas> {
  return catas[inst['@tag']](...inst['@values']);
}


//// utils?

type TagsOf<T> = T extends { '@tag': infer TTags } ? TTags extends string ? TTags : never : never;

// Test:
type TagsOfMaybe = TagsOf<Maybe<any>>;

type AnyCatasOf<T> = {
  [K in TagsOf<T>]: AnyCataHandlerOf<T, K>;
};

type AnyCataHandlerOf<T, K> = (...args: CataValuesOfTag<T, K>) => any;

// These are currently just returning any... Because of AnyCataHandlerOf and AnyCatasOf?  Possibly.
// I think a prior constraint of TCatas to extend `AnyCatasOf` which itself uses `AnyCataHandlerOf` pins the return types to `any`, simply because there's no attempt to actually get a type more specific than `any`.
type AnyCataHandlerReturnType<TCatas extends { [k: string]: (...args: any[]) => any }> = ReturnType<TCatas[keyof TCatas]>;
// type AnyCataHandlerReturnType<TCatas> =
//   TCatas extends { [k: string]: (...args: any[]) => infer TReturn }
//   ? TReturn
//   : never
//   ;

type CataValuesOfTag<TSum, TTag> =
  TSum extends { '@tag': TTag, '@values': infer TValues }
  ? TValues extends any[]
  ? TValues
  : never
  : never
  ;

// Test:
type CatasOfMaybe = AnyCatasOf<Maybe<boolean>>;

// Using AnyCatasOf<T> here is causing all the handlers in maybeBooleanHandlers to have a declared return type of `any`.  Hm.
const maybeBooleanHandlers: CatasOfMaybe = {
  Nothing: () => 'nothing!',
  Just: (value) => String(value),
}

type MaybeBooleanHandlersReturnTypes = AnyCataHandlerReturnType<CatasOfMaybe>;
```

So, that's not working.  Need to start back from the top, with the structure of things.

- `TagsOf<T>` works, so we can use that, at least.
- We then need to ensure that the catas map has a handler for each of those tags.
    - Start with `ArgsByTagsOf<T>`?
    - Also an `AnyReturnType<T extends { [k: string]: () => any }>`?
- Is the intersection-with-union thing the best way to go about it?
    - Also, also, do we really need the `@` prefixes if we're sticking values on an array?

I know that for `cata`, we obviously need the TType first, otherwise we can't derive the tags with `TagsOf`.


### Try 2 with POJOs + Functions

Did up a better whack at the types [here](./AsyncData%20in%20TypeScript%20Examples/objects-and-functions-r1.ts).

This actually seems to work pretty well.  There's a few rough edges:

- Cata doesn't auto-infer the types of handler parameters.
    - Maybe doable with a `TCatas extends CatasOf<TSum, TCatas>` mapped-type dealio?
- Manipulators are all data-first which is nice for imperative style, but not so nice for functional style.  Curried functions are such bullshit to type, though.
- Pretty sure I can create something for the actual interface.

In fact, here's a whack at the interface creator thingy, at least the Type:

```typescript
type TaggedSum<
  TSumName extends string,
  TTagDefs extends AnyTagDefs
> = { '@sum': TSumName } & TaggedSumTags<TTagDefs>;

type AnyTagDefs = { [k: string]: any[] };

type TaggedSumTags<
  TTagDefs extends AnyTagDefs,
  TTagName extends keyof TTagDefs = keyof TTagDefs
> =
  TTagName extends string
  ? TTagDefs[TTagName] extends any[]
  ? { '@tag': TTagName; '@values': TTagDefs[TTagName] }
  : never
  : never
  ;
```
