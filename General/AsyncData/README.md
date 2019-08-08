AsyncData
=========

Place for thoughts on [AsyncData](https://medium.com/javascript-inside/slaying-a-ui-antipattern-in-react-64a3b98242c) related things, regardless of language, where AsyncData here speaks specifically about a representation of asynchronous data and its various result states.

If I had to give one reason for using what seems like such a simple abstraction like AsyncData rather than a datum variable and some flags, I'd say it's this: With AsyncData, I have only to think about the AsyncData variable itself, and how that single variable changes through out time; with the datum and flags, I have to thing about three separate things, and how they change over time.

> NOTE: Examples written in a mishmash of pseudo-Haskell/Elm/Whatever.

> NOTE: I try to maintain consistent naming, but sometimes slip up between Result and Data.  Those two should be considered the same case.

At minimum, it's represented by the following ADT:

```
type AsyncData r e =
  | NotAsked
  | Waiting
  | Error e
  | Result r
```

In Typescript, you might use a simple union on tuples:

```typescript
type AsyncData<TResult, TError> =
    | ['NotAsked']
    | ['Waiting']
    | ['Error', TError]
    | ['Result', TResult]
```

Or something using an enum for the tag names, or a class...

In Javascript, you might use something like [Daggy](https://www.npmjs.com/package/daggy) to create a friendly set of constructors:

```js
const AsyncData = daggy.createTaggedSum({
    NotAsked: [],
    Waiting: [],
    Error: ['error'],
    Result: ['result'],
});
```

> Note: There are various other names for the Result case, including Success and Data.  To make it less specific, I'm sticking with Result.  Due to certain languages and/or libraries where expression of this pattern requires named properties, using Result allows the property itself to be named `result`, which makes for a bit less to remember.



## Background

Aside from and/or paraphrasing from the article, the concrete benefits are:

- AsyncData provides a synchronous, always-defined, always-transformable value to wrap around data that may or may not be present right this moment.
    - This is necessary because UI render functions don't deal in "values that we Promise will be there later", they only deal in "values that are here right now".
    - Since we don't know when the Response Data will be here now, we wrap access to it in AsyncData so we have something that the UI can always use right now.
- AsyncData removes the need to separately track "is fetching" state.
- AsyncData reduces the need to deal with nullable data by providing:
    - Safe accessors: `#getDataOr(elseValue)` and `#getErrorOr(elseValue)`
    - A safe way to transform data if present: `#map(data => changedData)`
- AsyncData is unambiguous in cases where the actual data itself may be null.
- AsyncData removes the need to duplicate logic around managing loading and error states, and provides a ready model.


### On Synchronous vs Asynchronous Values

The first point in the list of benefits is that "AsyncData provides a synchronous, always-defined, always-transformable value", with the note about how render _functions_ don't deal in "values that we Promise will be there later" but only in "values that are here right now".

Put another way, a function can only render a synchronous value derived from synchronous values, and the moment you try to render based on asynchronous values, you get asynchronous rendering, which will happen Some Time Later, which is to say, not Now.

Which of course circles back around to the whole point demonstrated in the [above-linked article](https://medium.com/javascript-inside/slaying-a-ui-antipattern-in-react-64a3b98242c).



## Useful Operations on AsyncData

Secondarily, there are a number of useful operations we can define on these types.


### Creation

Since you can have different cases, a generic `of a` would likely just be `of a = Result a`.  Since I don't like assuming the behaviors of other types, I'd say to be properly specified, you'd need a separate `ofError a = Error a`.  That means there's no real use for them, and just using the AsyncData Constructors directly is fine.


### Map

I define two separate map operations, though in loosely typed languages I tend only to use the one mapping the Result type:

```
-- the typical fmap
map :: (ra -> rb) -> (AsyncData ra e) -> (AsyncData rb e)

-- for mapping errors
mapError :: (ea -> eb) -> (AsyncData r ea) -> (AsyncData r eb)
```


### Join/Flatten

Not much to say here.  I suppose you really need both `join` and `joinError` just like you need `map` and `mapError`.  I don't yet tend to do async operations from errors, but I've mostly used this pattern on the front end so far.

```
-- NOTE: there's actually 4 results here across 2 functions:
-- The first in the error cases could have either the outer error
-- if it's Error e, or the inner error if it's Result (Error e).
-- I've glossed over that here, though.
join :: (AsyncData (AsyncData a e) e) -> AsyncData a e
joinError :: (AsyncData a (AsyncData a e)) -> AsyncData a e
```

Usually I only implement the first one, though the latter is theoretically possible.  I've not yet encountered it in a production app, though.

In JS, I usually implement it thus:

```js
function AsyncData$flatten() {
  return this.cata({
    NotAsked: () => this,
    Waiting: () => this,
    Error: () => this,
    Result: result => (
      AsyncData.is(result)
        ? result
        : this
    )
  })
}
```

Though it could also be done thusly in my usual implementations:

```js
function AsyncData$flatten() {
  return this.map(a => (AsyncData.Result.is(a) ? a.result : a))
}
```

This is technically different than the interface I specified, but I usually do it like this due to JS's non-strictness.


### Flat Map

Even less to say here.

```
flatMap = join . map
```


### Data Of, Error Of

A simple extractors, because sometimes you just want maybe a value, and mapping all the cases is annoying.  What do we do with annoying repetitious things?  Stick them in a function.

```
dataOf :: AsyncData d e -> Maybe d
dataOf ad = match ad:
    Result d -> Maybe.Just d
    Error _ -> Maybe.Nothing
    Waiting _ -> Maybe.Nothing
    NotAsked _ -> Maybe.Nothing

errorOf :: AsyncData d e -> Maybe e
errorOf ad = match ad:
    Result _ -> Maybe.Nothing
    Error e -> Maybe.Just e
    Waiting _ -> Maybe.Nothing
    NotAsked _ -> Maybe.Nothing
```

In places where you have a Maybe implemented, you'd just do something like this:

```
dataOr elseValue = (or elseValue) . dataOf
```

where `or` there is `or :: u -> Maybe t -> (t | u)` and just does `or elseValue maybeValue = match maybeValue: Just v -> v; Nothing -> elseValue;`.

In more imperative contexts like JS, simply defining `dataOr` and `errorOr` up front is very helpful because trying to convince most people that Maybe monads are useful is an uphill battle.


### Coalesce

This is an opinionated way to combine 2 AsyncData instances in a manner that I've found is _usually_ most suitable to UI rendering.  It prioritizes cases in the following manner, as it seems to be the most common order of precedence:

1. Error
2. Waiting
3. NotAsked
4. Result

```
coalesce :: (ra -> rb -> rc) (Maybe ea -> Maybe eb -> ec) (AsyncData ra ea) (AsyncData rb eb) -> (AsyncData rc ec)
coalesce mergeReses mergeErrors a b = match a:
  Result ra -> match b:
    Result rb -> Result (mergeReses ra rb)
    Error eb -> Error eb
    Waiting -> Waiting
    NotAsked -> NotAsked
  Error ea -> match b:
    Result _ -> Error ea
    Error eb -> Error (mergeErrors ea eb)
    Waiting -> Error ea
    NotAsked -> Error ea
  Waiting -> match b:
    Result _ -> Waiting
    Error eb -> Error eb
    Waiting -> Waiting
    NotAsked -> Waiting
  NotAsked -> match b:
    Result _ -> NotAsked
    Error eb -> Error eb
    Waiting -> Waiting
    NotAsked -> NotAsked
```

In more dynamic languages, this is easily implemented with the following behavior:

```js
function coalesce(a, b, mergeReses, mergeErrors) {
  if (AsyncData.Error.is(a) && AsyncData.Error.is(b))
    return AsyncData.Error(mergeErrors(a, b))

  if (AsyncData.Error.is(a)) return a
  if (AsyncData.Error.is(b)) return b

  if (AsyncData.Waiting.is(a)) return a
  if (AsyncData.Waiting.is(b)) return b

  if (AsyncData.NotAsked.is(a)) return a
  if (AsyncData.NotAsked.is(b)) return b

  return a.map(ra => b.map(rb => mergeReses(ra, rb))).flatten()
}
```

Now, I only specified that there's a `mergeErrors` to handle the case of both values being Error cases, but what we probably need is both `mergeErrors` and `mapError`.  The formmer would still only be called if both values are Error cases, but the latter ensures we're able to render any errors into a consistent shape.  We don't need a separate `mapReses` because unlike the error cases, we only have one case where we deal with any reses at all: when both values are Result cases.

Since errors tend to be pretty uniform, or ought to be, and merging them isn't always the most useful, I usually just return which ever error came first, making the type just this:

```
coalesce :: (ra -> rb -> rc) -> (AsyncData ra ea) -> (AsyncData rb eb) -> AsyncData rc (ea | eb)
```


### All

The `all` function uses `coalesce` to reduce a list of AsyncDatas an ideomatic way.  It's quite useful for "something in this collection of things is still loading" or "something in there errored" type indications.

```
-- Just keep the first one...
allMergeErrors ea _ = ea

:: List a -> a -> List a
allMergeResults ra rb = append ra rb

:: List (AsyncData a e) -> AsyncData (List a) e
all datas = reduce (coalesce allMergeResults allMergeErrors) (AsyncData.Result []) datas
```

While the defined behavior is to discard any errors after the first (imitative of JS's Promise.all), it's unlikely in such a case you would not have access to those errors, and if there are specific errors messages, they should be rendered based on the specific errors, not from an aggergate.

Obviously, if you need to check if a collection of elements has any `Waiting` in it without regard for `Error`, then just do `List.any (AsyncData.is AsyncData.Waiting) listOfAsyncData`.
