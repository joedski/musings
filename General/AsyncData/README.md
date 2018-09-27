AsyncData
=========

Place for thoughts on AsyncData related things, regardless of language, where AsyncData here speaks specifically about a representation of asynchronous data and its various result states.

> NOTE: Examples written in a mishmash of pseudo-Haskell/Elm/Whatever.

At minimum, it's represented by the following ADT:

```
type AsyncData r e =
  | NotAsked
  | Waiting
  | Error e
  | Result r
```

There are various other names for the Result case, including Success and Data.  To make it less specific, I'm sticking with Result.  Due to certain languages and/or libraries where expression of this pattern requires named properties, using Result allows the property itself to be named `result`, which makes for a bit less to remember.



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


### Flat Map

Even less to say here.

```
flatMap = join . map
```


### Coalesce

This is an opinionated way to merge N AsyncData instances in a manner that is most suitable to UI rendering.  Note that they must already have their results wrapped in lists/arrays.

```
:: (AsyncData [ra] ea) (AsyncData [rb] eb) -> (AsyncData [ra rb] ea|eb)
coalesce2 a b = match a:
  | Result ras -> match b:
    | Result rbs -> Result (concat ras rbs)
    | Error eb -> Error eb
    | Waiting -> Waiting
    | NotAsked -> NotAsked
  | Error ea -> Error ea
  | Waiting -> Waiting
  | NotAsked -> NotAsked
```

To facilitate this, then, I usually define the actual `coalesce` in terms of a sequence type:

```
coalesce ads = match ads:
  | a:rs -> coalesce2 (map (a -> [a]) a) (coalesce rs)
  | a:[] -> (map (a -> [a]) a)
  | [] -> Not Allowed
```

Obviously that last case makes it problematic to use in strict languages, as it means you must require it be called only on N >= 1 AsyncDatas, but in general it's a very useful way to combine things.
