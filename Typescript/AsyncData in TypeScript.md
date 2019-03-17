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

Writing out all the object props is kinda annoying when writing all the constructors.  In fact, writing all those constructors is annoying, period...  Doing `export const { Foo, Bar } = taggedSumConstructors(...)` would be nicer.  What would this look like, though?

```typescript
function taggedSumConstructors<TSum extends AnyTaggedSum>(keys: keyof TSum): TaggedSumConstructors<TSum> {
  // ???
}
```

Hm.  Given that I'm trying to work with both concrete values and types at the same time, some repetition may be inevitable.  Is there any way to prevent that, though?  I'm not sure there is.

- I'm trying to have all the value tuples defined in either `TaggedSum` or in `taggedSumConstructors`.
- You can't just attach Types to Objects.
- ... You could maybe extract it from a Type Parameter if you assert a returned Object as some Type with said Type Parameter.  Hm.

I guess if you set it up as `{ [k: string]: (...args: any[]) => any[] }` then it could work?  Hmmmm.  On the other hand, you need to know the types of everything you're dealing with, but if you have more than one Type Parameter, technically all Constructors must repeat those Type Paremeters.  Which leads to what may be the real issue: You can't dynamically define how many type parameters something has, that's too meta for TS.

For example:

- `Maybe<T>` or `Option<T>` have 1 type parameter.
    - Constructors for these types would then require 1 type parameter.
- `Either<L, R>` and `AsyncData<R, E>` have 2 type parameters.
    - Constructors for these types would then require 2 type parameters.

There's one way I could think of around this: Using a Tuple as the Type Param.  This is ... Doable, but makes it really annoying to write out at any point of use.  Like, why is there a tuple?  Why not just a type?  Which elements do I need to include for this constructor?  Why are there (almost) all of the brackets in one place?

```typescript
let data: asyncData.AsyncData<[IRes, Error]> = asyncData.Waiting<[IRes, Error]>()
```

That would neatly solve the n-parameters issue though.  I'll try it anyway, despite misgivings, seeing as Typescript 3.x has brought such improved support for tuples and manipulations thereof.  It might work, or it might just make things worse.  All things considered, even the current work is a pretty good place to be.

So, what do I need to make this work in as generic a way as possible?

- I need to be able to define everything at the Constroctor Creation Function.  That should be able to create a Tagged Sum Type and the according Constructors.
    - The Predicates should be trivial, too, at that point.
- I then need to be able to be able to export everything, which means I must be able to extract the Tagged Sum Type from the Created Constructors.
- The Tagged Sum Type Parameters need to be as far in as possible.

```typescript
const maybeConstructors = taggedSum('Maybe', <Ts extends [any]>() => ({
  Just: (a: Ts[0]) => [a],
  Nothing: () => [],
}));
export const { Just, Nothing } = maybeConstructors;
export type Maybe<Ts extends [any]> = ExtractTaggedSumType<typeof maybeConstructors>;
```

Then, when strictly specifying the type parameters (because, say, you're flatmapping a Maybe), you'd do something like

```typescript
const maybeSomeNumber = maybe.Just(-5); // :: maybe.Maybe<[number]>
const someValue: maybe.Maybe<[number]> = maybe.flatMap(maybeSomeNumber, (n: number) => (n >= 0 ? maybe.Just(n) : maybe.Nothing()));
```

The whole `Ts[0]` business is pretty annoying, but eh, I guess.  I suppose another option is to do something like,

```typescript
type Maybe<T> = ExtractTaggedSumType<typeof maybeConstructors, [T]>;
```

But then there's asymmetry between the Constructors, which have to be done with `maybe.Nothing<[number]>()`.  However, I'm not sure if that matters when you can do `const foo: maybe.Maybe<number> = maybe.Nothing()`, so, eh?  It might not actually come up that often.  Hmmmm.

At any rate, this implies that at the very least, `TaggedSum<>` should be something like `TaggedSum<TSumName, TSumParams extends any[], TTagDefs>`.  The problem then is that `TSumParams` doesn't really get used anywhere, which means ... I'm not sure.  TS is primarily built around structural typing, though, so if a param isn't exactly used, then, well, it might well vanish.

Okay, correction to previous thought: `TSumParams` isn't used anywhere in the _generic shape_ of `TTagDefs`, but it _is_ used in any specified shape.  For instance...

```typescript
type Maybe<A> = TaggedSum<'Maybe', [A], {
    Just: [A];
    Nothing: [];
}>;

type AsyncData<R, E> = TaggedSum<'AsyncData', [R, E], {
    NotAsked: [];
    Waiting: [];
    Error: [E];
    Result: [R];
}>;
```

It does look redundant there, granted.

So, that's all well and good, but how might this all actually work?  I don't know, exactly, but I think the first thing will be to just get each part separately.


### Getting the Constructors

The Constructors don't really care about the Parameters Tuple, all they really do is create each Instance.  Further more, they just return an Instance of the Tagged Sum Type, the particular Tags are themselves never referenced, except maybe in the `cata` function and the `is` predicates.

Creating these from the Values Factories is pretty easy:

```typescript
const tagFactories = {};

for (const tagName in tagValuesFactories) {
    tagFactories[tagName] = (...args) => ({
        '@sum': sumName,
        '@tag': tagName,
        '@values': args,
    });
}
```

In fact, we don't even need to call the Value Factories themselves... We just need to make sure that each Tag Factory has its args set to the appropriate type: `(...args: ArgsTypes<tagValuesFactories[tagName]>) => (...)`

The problem as ever remains: No where does the tuple of type parameters ever show up.  Without that, we can't really keep things related, can we?

Hm.

I'm not actually sure what I'm trying to do with the types is possible.  I'll shelve it for now and try something a bit more repetitious but ultimately more doable?



## Separate Construction from Type Definition

I think things will be easier if I don't try to completely deduplicate.  JS isn't a language with Tagged Sums, and TS doesn't try to make it one, so there's going to be a bit of noise.

Instead, if I just make the Type and the Constructors separate, but feed the Type into the Constructors, then I should be able to create things with minimal headache.

I already have a pretty competent Type setup, I just need to figure out a good way to make specifying the constructors themselves not annoying.

```typescript
type TaggedSum<
  TSumName extends string,
  TTagDefs extends AnyTagDefs
> = { '@sum': TSumName } & TaggedSumTags<TTagDefs>;
```

Same one from before.  We don't have any extra type params in there, right now, those are specified by the created type itself.  Now we just need to define the Factories in terms of that.

```typescript
type TaggedSumFactory<TSum, TTagName> =
  (...args: TagValuesType<TSum, TTagName>) => TaggedSumInstance<TSum, TTagName>;

type TaggedSumInstance<TSum extends AnyTaggedSum, TTagName extends string> = Extract<TSum, { '@tag': TTagName }>;

type TagValuesType<
  TSum extends AnyTaggedSum,
  TTagName extends string
> = TaggedSumInstance<TSum, TTagName>['@values'] extends infer TValues
  ? TValues extends any[]
  ? TValues
  : never
  : never
  ;
```

This seems to work reasonably well.

```typescript
type Option<T> = TaggedSum<'Option', {
  Some: [T];
  None: [];
}>;

// :: [T]
type OptionSomeValuesType<T> = TagValuesType<Option<T>, 'Some'>;
// :: []
type OptionNoneValuesType<T> = TagValuesType<Option<T>, 'None'>;
```

We then also can make the factories' types just as easily.

```typescript
// :: (arg_0: T) => { '@sum': 'Option' } & { '@tag': 'Some', '@values': [T] }
type OptionSomeFactory<T> = TaggedSumFactory<Option<T>, 'Some'>;
// :: () => { '@sum': 'Option' } & { '@tag': 'Some', '@values': [] }
type OptionNoneFactory<T> = TaggedSumFactory<Option<T>, 'None'>;
```

There's still those blasted `<T>`s on there, though.  I think I'll just have to bite the bullet and specify the type parameters on each factory, though.

```typescript
type TaggedSumFactoriesMap<TSum extends AnyTaggedSum> = {
  [K in TagKeysOf<TSum>]: TaggedSumFactory<TSum, K>;
};

// :: { Some: (args_0: T) => { '@sum': "Option"; } & { '@tag': "Some"; '@values': [T]; }; None: () => { '@sum': "Option"; } & { '@tag': "None"; '@values': []; } }
type OptionFactoriesMap<T> = TaggedSumFactoriesMap<Option<T>>;
type OptionFactoriesMapSome<T> = OptionFactoriesMap<T>['Some'];
type OptionFactoriesMapNone<T> = OptionFactoriesMap<T>['None'];
```

Okay, so that's something.  How do we create the factories while still deferring the type parametrization to point-of-use?  Obviously, the factories are going to have to specify the type themselves, or else the parameters would have to be specified somehow before hand.  This is one reason I pondered tuples as type params before: We can't tell typescript to dynamically do `<...Ts[]>(...args: Args) => something`, that makes no sense!

So, nothing there, but how do I then get the types right without unduely tightening everything right away?  Well, what am I expecting to actually do with things?

```typescript
// where's the <T> in Option<T> come from?
const { Some, None } = taggedSum.createFactories<Option<T>>({
  Some: (t: T) => [t],
  None: () => [],
});
```

The problem seems to be that `Some` and `None` here are concrete values, not Types, and the only way to defer type parametrization there is to put it at the point of use, i.e. on the Factories `Some` and `None` themselves.  As stated before, `<T>(...args: Args) => T`, or... something like that.

Hm.

```
<Option<T>>() => ({
    Some: (a: T) => TaggedSumInstance('Option', 'Some', [a]),
    None: () => TaggedSumInstance('Option', 'None', []),
});
```

That doesn't even make sense, TS wise, but is ... something.


### How About Structural Typing?

Some salvation may be found in the structural nature of Typescript's Typing system.  Each Tagged Sum is really just an Object that extends the Interface `{ '@sum': string, '@tag': string, '@values': any[] }`.  Using this, we can with some amount of repetition recreate the constituent type, even if it's going around the long way.  We just need those three elements, the Sum Name, the Tag Names, and the Values Tuples.

In isolation, then, we know that any Tagged Sum of a particular Sum has the type `TSum extends { '@sum': TSumName, '@tag': string, '@values': any[] }`.  No type params.

We also know that any particular Tag has the type `TSumTag extends { '@sum': TSumName, '@tag': TTagName, '@values': any[] }`.  Again, no type params.

Type params only come into play when actually specifying `@values`.

Further, we know that with, say, `Maybe<T>`, we can have either one of `{ '@sum': 'Maybe', '@tag': 'Just', '@values': [true] }` and that will be `Maybe<boolean>`, or `{ '@sum': 'Maybe', '@tag': 'Nothing', '@values': [] }` and that will be `Maybe<unknown>`.

So, technically, we don't need to actually pass any params in.  In fact, we don't really need to pass anything in at all...

```
const factories = createFactories('Maybe', {
    Just<T>(a: T) => [a],
    Nothing() => [],
});
```

And we just return the shapes, and everything should be fine?

```typescript
function createFactories<
  TSumName extends string,
  TValuesFactories extends { [key: string]: (...args: any[]) => any[] },
>(sumName: TSumName, valuesFactories: TValuesFactories) {
  type ValuesFactoriesType = typeof valuesFactories;
  type InstanceFactoriesType = {
    [K in keyof ValuesFactoriesType]: <TArgs extends ReturnType<ValuesFactoriesType[K]>>(...args: TArgs) => {
      '@sum': TSumName,
      '@tag': K,
      '@values': TArgs
    };
  };

  const instanceFactories: InstanceFactoriesType = {} as InstanceFactoriesType;

  for (const tagName in valuesFactories) {
    instanceFactories[tagName] = <TArgs extends any[]>(...args: TArgs) => ({
      '@sum': sumName,
      '@tag': tagName,
      '@values': args,
    });
  }

  return instanceFactories;
}

// Some :: <TArgs extends {}[]>(...args: TArgs) => { '@sum': "Option"; '@tag': "Some"; '@values': TArgs; }
// None :: <TArgs extends {}[]>(...args: TArgs) => { '@sum': "Option"; '@tag': "None"; '@values': TArgs; }
const { Some, None } = createFactories('Option', {
  Some<A>(a: A) { return [a] },
  None() { return [] },
});

// Some(true) :: <[boolean]>(args_0: boolean) => { '@sum': "Option"; '@tag': "Some"; '@values': [boolean]; }
const optionValue0: Option<boolean> = Some(true);
// optionValue1: Type Error: types of property 'length' are not compatible: 2 is not assignable to 1.
// Some(true, false) :: <[boolean, boolean]>(args_0: boolean, args_1: boolean) => { '@sum': "Option"; '@tag': "Some"; '@values': [boolean, boolean]; }
const optionValue1: Option<boolean> = Some(true);

type ReturnTypeSomeExtendsOption<T> = typeof Some extends <TArgs extends [T]>(...args: TArgs) => Option<T> ? true : false;
// = true
type ReturnTypeSomeExtendsOptionBoolean = ReturnTypeSomeExtendsOption<boolean>;
```

Close, but both are currently arbitrarily long.  Need to tie the lengths somehow.  How about if I use the args type rather than the return type?

```typescript
function createFactories<
  TSumName extends string,
  TValuesFactories extends { [key: string]: (...args: any[]) => any[] },
>(sumName: TSumName, valuesFactories: TValuesFactories) {
  type ValuesFactoriesType = typeof valuesFactories;
  type InstanceFactoriesType = {
    [K in keyof ValuesFactoriesType]: <TArgs extends ReturnType<ValuesFactoriesType[K]>>(...args: TArgs) => {
      '@sum': TSumName,
      '@tag': K,
      '@values': TArgs
    };
  };

  const instanceFactories = {} as InstanceFactoriesType;

  for (const tagName in valuesFactories) {
    instanceFactories[tagName] = <TArgs extends ReturnType<ValuesFactoriesType[typeof tagName]>>(...args: TArgs) => ({
      '@sum': sumName,
      '@tag': tagName,
      '@values': args,
    });
  }

  return instanceFactories;
}

type ArgsType<TFn> = TFn extends (...args: infer TArgs) => any ? TArgs : never;

// Some :: <TArgs extends [{}]>(...args: TArgs) => { '@sum': "Option"; '@tag': "Some"; '@values': TArgs; }
// None :: <TArgs extends []>(...args: TArgs) => { '@sum': "Option"; '@tag': "None"; '@values': TArgs; }
const { Some, None } = createFactories('Option', {
  Some<A>(a: A) { return [a] },
  None() { return [] },
});

// Some(true) :: <[boolean]>(args_0: boolean) => { '@sum': "Option"; '@tag': "Some"; '@values': [boolean]; }
const optionValue0: Option<boolean> = Some(true);
// optionValue1 :: Option<boolean>
// Some(true, false): Expected 1 argument, got 2.
const optionValue1: Option<boolean> = Some(true, false);

type ReturnTypeSomeExtendsOption<T> = typeof Some extends <TArgs extends [T]>(...args: TArgs) => Option<T> ? true : false;
// still = true
type ReturnTypeSomeExtendsOptionBoolean = ReturnTypeSomeExtendsOption<boolean>;
```

Interesting that you get `{}` for the type parameter there, but it does seem to work: given an actual concrete type, it replaces the `{}` with that type.  Which makes sense, `{}` is kinda close to `any` since JS will autobox primitives.

> Aside: `null extends {}` will pass, but `void extends {}` will not.  Interestingly, a point of divergence: `void extends any` will pass.

Otherwise, though, this seems to work as desired.


### How About a Type Error on Not Specifying All the Factories?

Perhaps we can feed the Type in with `unknown` for parameters to allow some validation?

```typescript
function createFactories<
  TSum extends AnyTaggedSum,
>(sumName: SumNameOf<TSum>, valuesFactories: ValuesFactoriesOf<TSum>) {
  type TValuesFactories = ValuesFactoriesOf<TSum>;
  type InstanceFactoriesType = {
    [K in keyof TValuesFactories]: <TArgs extends ArgsType<TValuesFactories[K]>>(...args: TArgs) => {
      '@sum': SumNameOf<TSum>,
      '@tag': K,
      '@values': TArgs
    };
  };

  const instanceFactories = {} as InstanceFactoriesType;

  for (const tagName in valuesFactories) {
    instanceFactories[tagName] = <TArgs extends any[]>(...args: TArgs) => ({
      '@sum': sumName,
      '@tag': tagName,
      '@values': args,
    });
  }

  return instanceFactories;
}

type ArgsType<TFn> = TFn extends (...args: infer TArgs) => any ? TArgs : never;

type ValuesFactoriesOf<TSum extends AnyTaggedSum> = {
  [K in TagKeysOf<TSum>]: (...args: TagValuesType<TSum, K>) => TagValuesType<TSum, K>;
};

// Some :: <TArgs extends [any]>(...args: TArgs) => { '@sum': "Option"; '@tag': "Some"; '@values': TArgs; }
// None :: <TArgs extends []>(...args: TArgs) => { '@sum': "Option"; '@tag': "None"; '@values': TArgs; }
const { Some, None } = createFactories<Option<any>>('Option', {
  Some: <A>(a: A) => [a],
  None: () => [],
});

// Same types and errors as before.
const optionValue0: Option<boolean> = Some(true);
const optionValue1: Option<boolean> = Some(true, false);

type ReturnTypeSomeExtendsOption<T> = typeof Some extends <TArgs extends [T]>(...args: TArgs) => Option<T> ? true : false;
// also still = true
type ReturnTypeSomeExtendsOptionBoolean = ReturnTypeSomeExtendsOption<boolean>;
```

That's definitely better.  We even get some improvements from the exact locking down of `valuesFactories`:

- Missing a case results in a type error.
- An extra case results in a type error.
- The wrong number of arguments results in a type error, admittedly kind of a weird looking one.
- The wrong number of tuple elements results in a type error.

There's still one major issue, though:

- If you have two type parameters in one case, it can't catch the mis-ordering of them in the return value.
    - Even more amusingly, you don't even need to add any type parameters to the factories at all.  `<A, B>(a: A, b: B) => [a, b]` is treated the same as `(a, b) => [a, b]`.
    - It all comes back to all the types being broadened to `any`, though.  Without being able to maintain explicit relationships, the separate type params, the order no longer matters.  It works, but only because we tell it to work.

```typescript
type ExtraOption<A, B> = TaggedSum<'ExtraOption', {
  Lots: [A, B];
  Little: [];
}>;

const { Lots, Little } = createFactories<ExtraOption<any, any>>('ExtraOption', {
  Lots: <A, B>(a: A, b: B) => [a, b],
  Little: () => [],
});
```

If I don't want to hardcode things, then I have to use a broad type like `any` so that `Lots` and `Little` can specialize later.  If I use concrete values like `"A"` and `"B"`, then they get locked to those values because the types are written to only narrow, never broaden.

```typescript
const { Lots, Little } = createFactories<ExtraOption<'A', 'B'>>('ExtraOption', {
  Lots: <A, B>(a: A, b: B) => [a, b],
  Little: () => [],
})

// Expected "A", not "C"; "C" is not assignable to "A".
// Same with "D" vs "B".
Lots('C', 'D')
```


### Runtime Hit, But Safer?

To make things a bit safer, we could actually require that the factories return a tuple of the args, then use those factories in the instance factories themselves.  This means two function calls, but you can be sure you'll receive the correct number of values during run time.

```typescript
function createFactories<
  TSum extends AnyTaggedSum,
>(sumName: SumNameOf<TSum>, valuesFactories: ValuesFactoriesOf<TSum>) {
  type TValuesFactories = ValuesFactoriesOf<TSum>;
  type InstanceFactoriesType = {
    [K in keyof TValuesFactories]: <TArgs extends ArgsType<TValuesFactories[K]>>(...args: TArgs) => {
      '@sum': SumNameOf<TSum>,
      '@tag': K,
      '@values': TArgs
    };
  };

  const instanceFactories = {} as InstanceFactoriesType;

  for (const tagName in valuesFactories) {
    instanceFactories[tagName] = <TArgs extends any[]>(...args: TArgs) => ({
      '@sum': sumName,
      '@tag': tagName,
      // Calling the values factory here.
      '@values': valuesFactories[tagName](...args),
    });
  }

  return instanceFactories;
}
```

No type changes, and technically no runtime changes, except for the extra function calls.



## Maybe Start With the Factories, Then Make the Type?

What if I tried it the other way around?  We need the factories anyway, and those have to be written out, so why not create the tagged sum from those?  Maybe we could do this, then?

```typescript
export const { NotAsked, Waiting, Error, Result } = taggedSum('AsyncData', {
    NotAsked: () => [],
    Waiting: () => [],
    Error: <E>(error: E) => [error],
    Result: <R>(result: R) => [result],
});

export type AsyncData<E, R> = TaggedSum<'AsyncData', typeof ({
    NotAsked, Waiting, Error, Results
});
```

Hmmm, not quite.  That whole Type Parameters thing rears its ugly head again.  Curses.  Guess I'm stuck with the repetition.  Plus, there's no way in the Constructors to indicate that we have two distinct types, and they'll all get converted to `{}` or `any` regardless.  Bleh!

I think the solution is something close to one prior exploration, where I define a tuple somewhere and reference indexed elements of it, but I'm still not sure how to actually save all those, or if it's even possible with TS's system right now.

My concern is that type reification will, instead of keeping relations to the parameters tuple, instead pull the currently inferred or derived types from the tuple.  Hence if `T = [unknown, unknown]` then `T[0]` will simply be reified to `unknown`.



## Maybe Indices?

Can I somehow use indices, then, as the references?  Then the types would be lazily determined.  How would that even work?  Would it work?

```typescript
const at =
    <T extends any[]>(t: T) =>
        <TI extends number>(index: TI): T[TI] => t[index];

const tuple = <T extends any[]>(...t: T): T => t;

const vals = tuple('foo', 42, true, { hello: 'world' });

// :: number
const valsAt1 = at(vals)(1);

// :: { hello: string }
const valsAt3 = at(vals)(3);
```

That kinda works, but is backwards from the case I'm trying to handle, I think.  The types in the Parameters Tuple will be lazily determined, while the indices will be determined up front.  It'd be more like `at(1)(vals)`, although that by itself is not quite what we're looking for.

I also tried doing tuples mapping tuples but that didn't quite work...

```typescript
const ats =
    <T extends any[]>(t: T) =>
        <TI extends Array<keyof T>>(...indices: TI): T[ElsOf<TI>] =>
            indices.map(i => t[i]) as T[ElsOf<TI>];

// creates a union, not a list.  Hm.
type ElsOf<T extends any[]> = T[Extract<keyof T, number>];
type TupleEls<T extends any[], TI extends (keyof T)[]> =
    { [I in keyof TI]: T[TI[I]] }
    ;
```

Anyway, let's try just inverting things:

```typescript
const at =
    <TI extends number>(index: TI) =>
        <T extends any[]>(t: T) => t[index];

const tuple = <T extends any[]>(...t: T): T => t;

const vals = tuple('foo', 42, true, { hello: 'world' });

// :: number
const val1 = at(1)(vals);
// :: { hello: string }
const val3 = at(3)(vals);
// :: undefined
const val4 = at(4)(vals);
```

That certainly works.

Still not sure I can generalize, though, given the trouble I had with the tuples mapping tuples thing.

```
type AsyncData<R, E> = TaggedSum<'AsyncData', [R, E], {
    NotAsked: [],
    Waiting: [],
    Result: [R],
    Error: [E],
}>;

const TypeConstructors = taggedSum<AsyncData<any, any>>('AsyncData', ['R', 'E'], {
    NotAsked: [],
    Waiting: [],
    Result: [0],
    Error: [1],
});
```

Maybe then tags are specified like this?

```
type AsyncDataResult<[R, E]> = TaggedSumTag<'AsyncData', [R, E], 'Result', [0]>;
```

If I could reliably map a tuple of indices across a tuple of types to get a derived tuple of types, I could solve this easily.  That's a possible solution, then.

```typescript
type TestTuple = [string, number, boolean, { hello: string }];
type IndexTuple = [0, 3];

// string | { hello: string }
type DerivedTuple = TestTuple[IndexTuple[Extract<keyof IndexTuple, number>]];
```

Not quite.  I think the problem is this:

```typescript
// 0 | 3
type ElsOfIndexTuple = IndexTuple[Extract<keyof IndexTuple, number>];
```

So, we need a mapped type, not a union type.  The problem there is that we end up with something that has properties, but isn't really an Array-tuple.  Not sure if that's actually material to our case, though.

```typescript
// 0 | 3
type ElsOfIndexTuple = IndexTuple[Extract<keyof IndexTuple, number>];

// { 0: string; 3: { hello: string; }; }
type DerivedTuple = {
    [I in ElsOfIndexTuple]: TestTuple[I];
}
```

Er, not quite what I'm going for.  Need both the element of the index and the index of the index.  The index-index.  Not confusing at all.  Unfortunately, I can't seem to dependably get that, instead just getting something like `[number, 0 | 3]`.  I think it's because `Extract<keyof SomeTupleType, number>` expands to just `number` rather than something like `0 | 1`.  TS is smart enough to know all `number`-addressable elements of a tuple, but we can't get concrete indices...

Perhaps I can still use this, though.  If I can get a union of elements within, then I should be able to get all properties that result in a value in that union.

```typescript
// "0" | "1"
type IndicesOfIndexTuple =
    keyof IndexTuple extends infer KI
    ? KI extends keyof IndexTuple
    ? IndexTuple[KI] extends ElsOfIndexTuple
    ? Extract<KI, string>
    : never : never : never;

// 0 | 3
type AnyElOfIndexTuple = IndexTuple[IndicesOfIndexTuple];
```

Need to use `Extract<KI, string>` to remove that `number` type.  Otherwise, that seems to work.

```typescript
// ["0" | "1", 0 | 3]
type EntriesOfIndexTuple =
    IndicesOfIndexTuple extends string
    ? [IndicesOfIndexTuple, IndexTuple[IndicesOfIndexTuple]]
    : never
    ;
```

Er, not quite.

```typescript
// ["0", 0] | ["1", 3]
type EntriesOfIndexTuple = EntryOfIndexTuple<IndicesOfIndexTuple>;

type EntryOfIndexTuple<I> =
    I extends keyof IndexTuple
    ? [I, IndexTuple[I]]
    : never
    ;
```

The accessory conditional type allows the union to distribute a layer up, expanding the `EntryOfIndexTuple<IT>` to `EntryOfIndexTuple<"0"> | EntryOfIndexTuple<"1">`.

We can then genericize this thusly:

```typescript
type EntriesOf<T extends any[]> = EntryOf<T, IndicesOf<T>>;

type EntryOf<T extends any[], I> = I extends keyof T ? [I, T[I]] : never;

type IndicesOf<T extends any[]> =
    keyof T extends infer KI
    ? KI extends keyof T
    ? T[KI] extends T[number]
    ? Extract<KI, string>
    : never : never : never;

type IndexTuple = [0, 3];

// ["0", 0] | ["1", 3]
type IndexTupleEntries = EntriesOf<IndexTuple>;
```

That's ... something, anyway.  Closer than anything else I've gotten.  What was I trying to do with this, now?

I think my ultimate goal was: Given Tuple T of Types and Tuple I of Indices, create a new Tuple D that is each element of T at index I.  So the above work is ... close, but not quite.


### Bring It Back Around: D as the T at each I

So, As stated before, I have two inputs:

- T, a Tuple of Types that must be a certain length.
- I, a Tuple of Indices.

From those, I want:

- D, a Tuple of Types from T for each element in I.

And code wise, I think I'm trying to do this:

```
(i: I) => <T>(...args: MappedTuple<T, I>) => MappedTuple<T, I>
```

Or more fully,

```
<I extends number[]>(tagName: string, i: I) =>
    <T extends TParams>(...args: MappedTuple<T, I>) =>
        Tag<SumName, TagName, MappedTuple<T, I>>
```

I'm not sure the type system allows that, but I'll try it?  It may be able to back-derive the types based solely on the structure, and just leave `unknown` or `any` (or `{}`) for anything it can't back-derive.

```typescript
type MappedTuple<
    T extends any[],
    I extends number[]
> = { [KI in ElsOf<I>]: T[KI] };

type ElsOf<T extends any[]> = T[number];

type TupleTest = [number, string, { hello: string }];
type TestIndices = [0, 2];
// { 0: number; 2: { hello: string }; }
type TestMapped = MappedTuple<TupleTest, TestIndices>;
```

Oops, meant to use the indices of the indices for the output.  That was the whole point of the Entries type.

```typescript
type MappedTuple<
    T extends any[],
    I extends number[]
> = { [KI in EntriesOf<I>[0]]: T[KI] };

type ElsOf<T extends any[]> = T[number];

type EntriesOf<T extends any[]> = EntryOf<T, IndicesOf<T>>;

type EntryOf<T extends any[], I> = I extends keyof T ? [I, T[I]] : never;

type IndicesOf<T extends any[]> =
    keyof T extends infer KI
    ? KI extends keyof T
    ? T[KI] extends T[number]
    ? Extract<KI, string>
    : never : never : never;

type TupleTest = [number, string, { hello: string }];
type TestIndices = [0, 2];
type IndicesEntries = EntriesOf<TestIndices>;
// { 0: number; 1: string; length: 3; }
type TestMapped = MappedTuple<TupleTest, TestIndices>;
```

... Erp.  Looks like `T[KI] extends T[number]` isn't enough when the length is the same as one of the elements.  Hmmm.


### An Aside: Specifying Tuple Length While Deferring Exact Type Inferrence

After walking away for a bit, I had a thought like this:

```typescript
type NAryFn<TArity extends any[]> = <TArgs extends TArity>(...args: TArgs) => TArgs;
type UnaryFn = NAryFn<[unknown]>;

// unaryFn: NAryFn<[unknown]>;
const unaryFn = (<A>(a: A) => [a]) as UnaryFn;
// unaryFn: <[number]>(args_0: number) => [number]
unaryFn(5);
```

Not sure if that's usable for what I was trying to do with the whole `TParams[1]` or whatever, but hey.



## In the Mean Time, Just Some Util Functions?

We already have the biggest part, `TaggedSum<TSumName, TTagDefs>`, so we can easily create the factories without need for much else.

```typescript
export type AsyncData<R = unknown, E = unknown> = TaggedSum<'AsyncData', {
    NotAsked: [],
    Waiting: [],
    Result: [R],
    Error: [E],
}>;

export const NotAsked: () => AsyncData = createTagFactory('AsyncData', 'NotAsked');
export const Waiting: () => AsyncData = createTagFactory('AsyncData', 'Waiting');
export const Result: <R>(r: R) => AsyncData<R> = createTagFactory('AsyncData', 'Result');
export const Error: <E>(e: E) => AsyncData<unknown, E> = createTagFactory('AsyncData', 'Error');
```

Hm.  Maybe this?

```typescript
function createTag<S extends string, T extends string, Vs extends any[](sumName: S, tagName: T, ...values: Vs) {
    return { '@sum': sumName, '@tag': tagName, '@values', values };
}

export const NotAsked = (): AsyncData => createTag('AsyncData', 'NotAsked');
export const Result = <R>(r: R): AsyncData<R> => createTag('AsyncData', 'NotAsked', r);
```




## More JS-Friendly Chaining?

```
value
    .pipe(maybe.flatMap, (a): maybe.Maybe<number> => (a >= 0 ? maybe.Just(a) : maybe.Nothing()))
    .pipe(maybe.map, a => a * 2)
```

That'd require adding `.pipe` but that's really simple to write: `{ pipe(fn, ...args) { return fn(this, ...args); } }`.

I think type wise it'd just be this:

```typescript
function pipe<This, TArgs extends any[], R>(
    this: This,
    fn: (inst: This, ...args: TArgs) => R,
    ...args: TArgs
): R {
    return fn(this, ...args);
}
```

Simple enough.



## Surprisingly Easy: Classes with Tuple Unions

Not sure where I came up with the idea, but using something that looks a bit closer to Elm in how the definition is created, I came up with this:

```typescript
abstract class TaggedSum<
  TSum extends string,
  TSpec extends [string, ...any[]]
> {
  sum: TSum;
  type: TSpec;

  constructor(sum: TSum, type: TSpec) {
    this.sum = sum;
    this.type = type;
  }
}
```

Then, it gets used like so:

```typescript
class Maybe<A = unknown> extends TaggedSum<
  'Maybe',
  ['Nothing'] | ['Just', A]
> {
  constructor(...type: TaggedSumTypes<Maybe<A>>) {
    super('Maybe', type);
  }
}

const maybe0: Maybe<string> = new Maybe('Nothing');
const maybe1: Maybe<string> = new Maybe('Just', 'this string');

// Also some errors:
// Error: '"5"' is not assignable to 'number'
const maybe2: Maybe<number> = new Maybe('Just', '5');
// Error: '3' is not assignable to '1' (because 'Nothing' should be the only arg.)
const maybeErrorTooManyArgs: Maybe<string> = new Maybe('Nothing', 'yes', 'no');
// Error: '"Just"' is not assignable to '"Nothing"'
const maybeErrorTooFewArgs: Maybe<string> = new Maybe('Just');
// Error: Missing the following properties from ["Just", unknown]: 0, 1
const maybeErrorNoType: Maybe<string> = new Maybe();
// Error: "Not A Type" is not assignable to "Nothing"
const maybeErrorNotValidType: Maybe<string> = new Maybe('Not A Type');
```

Kind of a motley bunch of errors, but eh.

A bit of boilerplate, but much less than before.  Getting Daggy-style factories is doable, though adds back a bit of boilerplate:

```typescript
class Maybe<A = unknown> extends TaggedSum<'Maybe', ['Nothing'] | ['Just', A]> {
  // Daggy style factories, if you're into that sort of thing.
  static Just<A>(a: A) {
    return new Maybe('Just', a);
  }

  // The <A = unknown> here lets TS infer the type instead of always
  // giving back Maybe<unknown>.  Neat!
  static Nothing<A = unknown>() {
    return new Maybe<A>('Nothing' as 'Nothing');
  }
}

const maybe0DaggyStyle: Maybe<string> = Maybe.Nothing();
const maybe1DaggyStyle: Maybe<string> = Maybe.Just('this string here');
```

Adding predicates is easy, though I opted not to stick them on the factories.  I'm able to get it to the proper case and number of values, but of course since it's coming from an `any`, who knows what the types of the values themselves are...

```typescript
class Maybe<A = unknown> extends TaggedSum<'Maybe', ['Nothing'] | ['Just', A]> {
  static is(inst: unknown): inst is Maybe<unknown> {
    return (
      inst != null
      && inst instanceof Maybe
    );
  }

  static isType<TTypeName extends TaggedSumTypeNames<Maybe<any>>>(
    type: TTypeName,
    inst: unknown
  ): inst is TaggedSumSpecializedTo<Maybe, TTypeName> {
    return (
      Maybe.is(inst)
      && inst.type[0] === type
    );
  }

  // ... other stuff.
}

type TaggedSumSpecializedTo<TSum, TTagName> =
  TSum extends TaggedSum<infer TSumName, infer TTypes>
  ? TTagName extends TaggedSumTypeNames<TSum>
  ? TaggedSum<TSumName, Extract<TTypes, [TTagName, ...any[]]>>
  : never : never;

const maybe0AsAny: any = maybe0;

if (Maybe.is(maybe0AsAny)) {
  maybe0AsAny.cata({
    Nothing: () => console.log('Nothing!'),
    Just: (a: unknown) => console.log('Just this:', a),
  });
}

if (Maybe.isType('Just', maybe0AsAny)) {
  // isType doesn't preserve anything besides the case name
  // and the number of values.
  // :: "Just"
  const typeName = maybe0AsAny.type[0];
  // :: unknown
  const typeValue1 = maybe0AsAny.type[1];
  // Error: no element at index 2.
  // And the returned value is properly undefined.
  const typeValue2 = maybe0AsAny.type[2];
}
```

Sadly, being static methods, we can't really pass those up to subclasses from the base class, so they have to be defined on the subclass itself.  Boo, boilerplate.  The whole reason they're static methods is so that the target value could be `null` or not have an `is()` method and the test would still work.

It's kind of annoying dealing with the tuple, so let's create some getters to simplify things:

```typescript
abstract class TaggedSum<
  TSum extends string,
  TSpec extends [string, ...any[]]
> {
  // ...

  get tag() {
    return this.type[0] as TSpec[0];
  }

  get values() {
    return this.type.slice(1) as Tail<TSpec>;
  }
}

// Can't currently do (T extends [any, ...infer TTail])
// Modified off of this:
//   https://github.com/Microsoft/TypeScript/issues/25719#issuecomment-433658100
type Tail<T> =
  T extends any[]
  ? ((...args: T) => any) extends (h: any, ...rest: infer TRest) => any
  ? TRest
  : never
  : never
  ;

if (Maybe.isType('Just', maybe0AsAny)) {
  // :: "Just"
  const typeName = maybe0AsAny.tag;
  // :: [unknown]
  const values = maybe0AsAny.values;
}
```

Also, speaking of Cata(morphism), that's actually surprisingly easy to setup in TS, contrary to the previous class-based attempt I made:

```typescript
abstract class TaggedSum<
  TSum extends string,
  TSpec extends [string, ...any[]]
> {
  // ...

  public cata<
    T extends AnyTaggedSum,
    H extends TaggedSumCataHandlers<T>
  >(this: T, handlers: H): ReturnType<H[TaggedSumTypeNames<T>]> {
    return handlers[this.type[0]](...this.type.slice(1));
  }
}

// Finally had to add utility types.

type AnyTaggedSum = TaggedSum<string, [string, ...any[]]>;

type TaggedSumCataHandlers<TSum> = {
  [HK in TaggedSumTypeNames<TSum>]: (...args: TaggedSumCataHandlerArgs<TSum, HK>) => any;
};

type TaggedSumTypeNames<TSum> =
  TSum extends TaggedSum<string, infer TTypes>
  ? TTypes extends [infer TNames, ...any[]]
  ? TNames
  : never
  : never
  ;

type TaggedSumCataHandlerArgs<TSum, THandlerKey> =
  TSum extends TaggedSum<string, infer TTypes>
  ? Tail<Extract<TTypes, [THandlerKey, ...any[]]>>
  : never
  ;

// Can't currently do (T extends [any, ...infer TTail])
// Modified off of this:
//   https://github.com/Microsoft/TypeScript/issues/25719#issuecomment-433658100
type Tail<T> =
  T extends any[]
  ? ((...args: T) => any) extends (h: any, ...rest: infer TRest) => any
  ? TRest
  : never
  : never
  ;

// using the maybe type...

// Error: missing props Just, Nothing
const mapbe0value0 = maybe0.cata({});
// Error: missing prop Just
const maybe0value1 = maybe0.cata({
  Nothing: () => 0,
});
// :: number
const maybe0value2 = maybe0.cata({
  Nothing: () => 0,
  Just: (a: string) => a.length,
});
// Haven't found a good way of restricting allowed props, but at least the return type is accurate to the only cases which are used.
// :: number
const maybe0value3 = maybe0.cata({
  Nothing: () => 0,
  Just: (a: string) => a.length,
  // Foo never gets called on Maybe.
  Foo: () => true,
});
```

But after that, I can define things like Map and Flatten in terms of Cata, much more easily than with the previous class based version.  The only problem with using Cata is that in cases where it's technically okay to return just the given instance as is, there's no way for TS to know that that handler will only be called if the instance has a given tag, so it can't appropriately narrow the types to understand that, in some cases, `Maybe<A>` actually is directly assignable to `Maybe<B>` because the type parameter isn't found on the instance due to the instance being a `Nothing`.

This leads to the ugly `as unknown as Maybe<B>` hack shown below.  Still thinking about this.

```typescript
class Maybe<A = unknown> extends TaggedSum<'Maybe', ['Nothing'] | ['Just', A]> {
  // ...

  map<A, B>(this: Maybe<A>, fn: (a: A) => B): Maybe<B> {
    return this.cata({
      Nothing: () => this as unknown as Maybe<B>,
      Just: (a: A) => new Maybe('Just', fn(a)),
    });
  }

  flatten<A>(this: Maybe<Maybe<A>>): Maybe<A> {
    return this.cata({
      Nothing: () => this as unknown as Maybe<A>,
      Just: (inner: Maybe<A>) => inner,
    });
  }

  flatMap<A, B>(this: Maybe<A>, fn: (a: A) => Maybe<B>): Maybe<B> {
    return this.map(fn).flatten();
  }
}
```

I suppose in these cases, it wouldn't be too bad to use the type check predicates, since that would make TS happier.  Cata is just so much nicer than imperative stuff, but at least wrapping the imperative stuff in functions makes it easier to deal with.

Or not, because the type predicate `is()` can only give intersection on the type.  It just so happens that `any` or `unknown` get swallowed up by such an intersection, but an existing type sticks around.  Alas, alas, always some messiness in there.

```typescript
class Maybe<A = unknown> extends TaggedSum<'Maybe', ['Nothing'] | ['Just', A]> {
  // ...

  map<B>(this: Maybe<A>, fn: (a: A) => B): Maybe<B> {
    // Error: Type 'Maybe<B>' is not assignable to type 'Maybe<A>'.
    if (Maybe.isType('Nothing', this)) return this;
    // The "as A" is needed because of how isType() works...
    if (Maybe.isType('Just', this)) return Maybe.Just(fn(this.values[0] as A));
  }
}
```

Anyway, it's almost as easy as using Daggy.
