Journal 2019-04-05 - RefreshableData - AsyncData across Time
============================================================

> 2020-04-16: Updated to reflect current understanding.

AsyncData is good for representing just the instantaneous state, but sometimes I need more: Both the instantaneous state, and the last displayable state.

The best way I've found to do this is to just retain all possible cases:

- Current: The most recent AsyncData value.
- Last Settled: The most recent AsyncData value that's either Data or Error.
- Last Data: The most recent AsyncData value that's Data.
- Last Error: The most recent AsyncData value that's Error.

By just making RefreshableData a quadruple, this covers every case I've encountered to date, so much so in fact that I've considered baking it into the actual Requests Module implementation.  Considered it, but so far I've not had any actual need to do that that couldn't be covered by just initializing a given RefreshableData stream using the currently stored value in the Requests Module.

Since RefreshableData is meant to cover the "Over Time" use cases, naturally you need a scanner/reducer:

```typescript
class RefreshableData<D, E> {
    constructor(
        protected current: AsyncData<D, E> = AsyncData.NotAsked(),
        protected lastSettled: AsyncData<D, E> = current,
        protected lastData: AsyncData<D, E> = current,
        protected lastError: AsyncData<D, E> = current,
    ) {}

    next(nextData: AsyncData<D, E>): RefreshableData<D, E> {
        return new RefreshableData(
            nextData,
            this.nextLastSettled(nextData),
            this.nextLastData(nextData),
            this.nextLastError(nextData)
        );
    }

    nextLastSettled(nextData: AsyncData<D, E>): AsyncData<D, E> {
        if (nextData.tag === 'Data' || nextData.tag === 'Error') {
            return nextData;
        }

        if (this.lastSettled.tag === 'Data' || this.lastSettled.tag === 'Error') {
            return this.lastSettled;
        }

        return nextData;
    }

    nextLastData(nextData: AsyncData<D, E>): AsyncData<D, E> {
        if (nextData.tag === 'Data') {
            return nextData;
        }

        if (this.lastData.tag === 'Data') {
            return this.lastData;
        }

        return nextData;
    }

    nextLastError(nextData: AsyncData<D, E>): AsyncData<D, E> {
        if (nextData.tag === 'Error') {
            return nextData;
        }

        if (this.lastData.tag === 'Error') {
            return this.lastData;
        }

        return nextData;
    }
}
```

I don't think there's anything else that's really needed.  Everything else I've needed was just operations on AsyncData.




Previous Version (2019-04-05)
=============================

> The previous version of this document is retained for historical purposes.

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

lastDataOf :: RefreshableData d e -> Maybe d
lastDataOf = third

lastErrorOf :: RefreshableData d e -> Maybe e
lastErrorOf = fourth

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
        AsyncData.NotAsked -> (a, na, lastDataOf r, lastErrorOf r)
        AsyncData.Waiting -> (a, na, lastDataOf r, lastErrorOf r)
        AsyncData.Error e -> (a, na, lastDataOf r, Maybe.Just e)
        AsyncData.Data d -> (a, na, Maybe.Just d, lastErrorOf r)
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



## Another Thought: Maybe Not Maybes

Stepping away for a moment, I think that perhaps using Maybes there wasn't the right choice.  It makes it a bit more work to support common rendering flows, by requiring using more of the props in mapping.  If instead we just left everything `AsyncData`, and used a separate `dataOf (AsyncData d e) -> Maybe d` intsead, we could better handle things like initial loading status.

However, that does introduce some ambiguity: What happens to `dataOf (RefreshableData d e)` when the first settled value is an error?  What about `errorOf` when it's data?  That could be too much to consider, even if `AsyncData` does accurately represent all the cases.

I think UIs might end up as:

```
view rd = match (dataOf rd) in:
    NotAsked -> loadingComponent
    Waiting -> loadingComponent
    Error e -> errorMessageComponent e
    Data d -> [
        -- double errorOf, wooo.
        match (errorOf (lastErrorOf rd)) in:
            Just e -> errorMessageComponent e
            Nothing -> emptyComponentOrSomethingIDontKnow
        , dataComponent d
    ]
```

I guess that's not too bad, except that double `errorOf`.
