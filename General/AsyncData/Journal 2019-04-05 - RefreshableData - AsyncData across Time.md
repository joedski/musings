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
    Maybe d,
    Maybe e
)

current :: RefreshableData d e -> AsyncData d e
current = first

dataOf :: RefreshableData d e -> Maybe d
dataOf = second

errorOf :: RefreshableData d e -> Maybe e
errorOf = third

new :: RefreshableData d e
new = (AsyncData.NotAsked, Maybe.Nothing, Maybe.Nothing)

next :: RefreshableData d e -> AsyncData d e -> RefreshableData d e
next r a = match a in:
    AsyncData.NotAsked -> (a, dataOf r, errorOf r)
    AsyncData.Waiting -> (a, dataOf r, errorOf r)
    AsyncData.Error e -> (a, dataOf r, Maybe.Just e)
    AsyncData.Data d -> (a, Maybe.Just d, errorOf r)
```

Pardon my pseudo-ML.

This seems to better formalize the usual pattern of `{ status, data, error }`.  Well, mostly by just giving it a name, which I guess is what such formalization is about, most of the time.  That and extractors, although in JS implementations that's usually just Instance Properties.
