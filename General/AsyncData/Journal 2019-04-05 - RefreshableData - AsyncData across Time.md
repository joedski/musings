Journal 2019-04-05 - RefreshableData - AsyncData across Time
============================================================

AsyncData is good for representing just the instantaneous state, but sometimes I need more: Both the instantaneous state, and the last displayable state.

I've got two thoughts on this:

- Simplest: Pair consisting of:
    - Current AsyncData
    - Last Settled AsyncData
- More Complex: Triple consisting of
    - Current AsyncData
    - Maybe Last AsyncData.Data Value
    - Maybe Last AsyncData.Error Value

I thought that the simplest case might be the way to do it, but it comes with an ambiguity: What is expected when an error arises for a moment between data cases?

Thinking about it, it's not usually expected that a momentary error will wipe out the data.  In the end, I think we may have to break out the two separate cases, as in the More Complex Case mentioned above.  This reflects, I think, the usual way this state is handled, albeit formalized into an actual Data Type.

So, more formally I guess, it'd be something like this:

```
type RefreshableData d e = (
    AsyncData d e,
    AsyncData d e,
    Maybe d,
    Maybe e
)

current :: RefreshableData d e -> AsyncData d e
current = first

lastSettled :: RefreshableData d e -> AsyncData d e
lastSettled = second

dataOf :: RefreshableData d e -> Maybe d
dataOf = third

errorOf :: RefreshableData d e -> Maybe e
errorOf = fourth

new :: RefreshableData d e
new = (AsyncData.NotAsked, Maybe.Nothing, Maybe.Nothing)

coalesceAsyncData :: AsyncData d e -> AsyncData d e -> AsyncData d e
coalesceAsyncData current next =
    let
        currentWhenSettled = match current in:
            AsyncData.NotAsked -> next
            AsyncData.Waiting -> next
            AsyncData.Error _ -> current
            AsyncData.Data _ -> current
    in
    match next in:
        AsyncData.NotAsked -> currentWhenSettled
        AsyncData.Waiting -> currentWhenSettled
        AsyncData.Error _ -> next
        AsyncData.Data _ -> next

next :: RefreshableData d e -> AsyncData d e -> RefreshableData d e
next r a =
    let
        na = coalesceAsyncData (current r) a
    in
    match a in:
        AsyncData.NotAsked -> (a, na, dataOf r, errorOf r)
        AsyncData.Waiting -> (a, na, dataOf r, errorOf r)
        AsyncData.Error e -> (a, na, dataOf r, Maybe.Just e)
        AsyncData.Data d -> (a, na, Maybe.Just d, errorOf r)
```

Pardon my pseudo-ML.

This seems to better formalize the usual pattern of `{ status, data, error }`.  Well, mostly by just giving it a name, which I guess is what such formalization is about, most of the time.  That and extractors, although in JS implementations that's usually just Instance Properties.


### Some Implementation Notes Regarding JS and other Null-Supporting Languages

It may be tempting to use `d | null` (nullable `d`) instead of `Maybe d`, but I would recommend against that for the simple reason that, if your request resolves to `null`, then it looks like you've never successfully resolved a request.  Admittedly, quite an edge case, but a possibility never the less.



## Use Cases Supported

In any case where a simple `AsyncData` is usable, don't use `RefreshableData`.  It's much simpler that way!

I'm not sure of any case where `lastError` is actually used, but it's there just in case?


### Volatile Data

This is somewhat less common, but still a use case.

- Last Data should only be visible if there's no Error.
- Last Error should replace Last Data if present.
- Last Data or Last Error should not be removed during Refresh.

In this case, the following values will be used:

- Current, to decide whether any Loading Indicator needs to show.
- Last Settled, to decide what to render.  In this use case, Data and Error should always replace each other.


### Less-Volatile Data

This is probably the most common use case of `RefreshableData`.

- Error should show while Refreshing if the last Settled Case was Error.
- Error should not show while Refreshing if the last settled Cas was not Error.
- Last Data should always be visible, if any.

In this case, the following values will be used:

- Current, to decide whether any Loading Indicator needs to show.
- Last Settled, to decide whether or not the Error should still show during Refresh.
- Last Data, to decide whether to show the Data or the Over All Loading Indicator.
