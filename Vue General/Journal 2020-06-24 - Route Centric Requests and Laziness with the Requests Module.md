Journal 2020-06-24 - Route Centric Requests and Laziness with the Requests Module
========

Suppose: We don't like the usual requests setup with manually managed requests and data, but we do like that we can be lazier with regards to fetching route specific data.

Whether or not that laziness is actually a good thing or not, we'll put that down for now and maybe pick it up later.

To wit, we'd like to have this:

- If we're on a given set of routes, fetch the data only once then do not fetch it again:
    - Go to `/foo/{id}`
        - Fetch `/api/foo/{id}`
    - Go to `/foo/{id}/bar`
        - Reuse data from `/api/foo/{id}`
    - Go back to `/foo/{id}`
        - Reuse data from `/api/foo/{id}`
- If we're on a given set of routes with certain parameters, then go to another set of parameters on that same set of routes, always fetch the new data:
    - Go to `/foo/{id}`
        - Fetch `/api/foo/{id}`
    - Go to `/foo/{id2}`
        - Fetch `/api/foo/{id2}`
    - Go to `/foo/{id}`
        - Fetch `/api/foo/{id}`

Hm.



## Typical Implementation (Not Global Requests Module/Service)

Let's go back to how requests are commonly implemented in Vue apps:

- Requests for a particular page are handled by a page-specific store module.
- This store module has a request-specific state slice for each given request. (And request-specific accessors.)
- Because of this, you can request once, then check future requests against some value (usually the ID) to see if you need to redispatch the request.



## Proposal 1: Request Key + Route-Request Key, or Single Memo Per Endpoint

The idea here is that we add a second key, the Route-Request Key, and use that to implement the above logic.

- Like the Request Key, it keys into a global store.
- Unlike the Request Key, however, it's not built from the Routes, but rather is associated with the Request generally.
    - It could be as simple as being the Request Name, or could be a fancy as some Route + Entity combo.  You could theoretically have multiple such keys though I'm not sure yet where that would occur.

The way it's used then is this:

- Route-Request Key keys into a Map of such keys to Request Keys.
- Determine if we need to Dispatch the Request:
    - If no Route Key is defined for a Route-Request Key: Dispatch.
    - If the Route Key defined for the Route-Request Key is different from the next Route Key: Dispatch.
    - If the Route Key defined for the Route-Request Key is the same, but the Request has never been dispatched: Dispatch.
    - Otherwise, do not Dispatch.

This could be implemented as a separate store module composing this added behavior atop the existing Requests Service, or could be a built-in functionality of the backing Requests Module itself.



## Proposal 2: Request Key + Should-Request Predicate

I guess this is sort of an "ultimate abstraction" of the above:

- We still have the Request Key, since that is how requests themselves are managed.
- The Should-Request Predicate itself is an option that is a function which accepts the next Request Options and the previous Request Options and returns whether or not the next request should be made.
    - That is, `(next: RequestOptions, prev: RequestOptions) => boolean`
    - This is intentionally the same as a Vue Watch Handler.
- This is executed for every single dispatch.
    - This also fits nicely within the existing execution model, it's just that the "should execute next request" how has an overridable component.  Granted, it's a hook before the other checks like "is this forced otherwise is there another in-progress request".
- Theoretically you only need to pass the previous Request Options since, at the time of Request Option Creation you have access to everything in the Requset Options.
    - Theoretically, you could also just use `this` to refer to the next Request Options as that's what the next one would be, and the request machinery is specified to execute the function with that request as the `this`-context.  Doable so long as it's explicitly specified, but would mean you couldn't use arrow functions.

Then, this would function like so for the default mode of operation:

- The `key` is the default Method + Path key.
- Should-Request Predicate omitted, or just returns `true`.

And like this for the above desired mode of operation:

- The `key` is defined as just the name of the request.
- The Should-Request Predicate then compares the Method + Path key of each request to see if they changed.

That's still separate from the other consideration of "Should we dispatch this request based on the current state"...



## Aside: Generalizing Lazy vs Eager vs Forced

Thinking about the above, with the Should-Request Predicate, we've got another decision to make: Do we make the request based on the current state?

There was previously only 1 alternate strategy proposed: "Lazy", which makes the request only if the current state is not "AsyncData.Waiting" or "AsyncData.Data".

However, there was also another one that was at least tossed about as maybe being sometimes necessary: "Forced".

Given the Predicate solution for the Should-Request thing, maybe this could receive similar treatment.

- Default: If current AsyncData is Waiting, Skip; Otherwise Execute.
- Lazy: If current AsyncData is Waiting or Data, Skip; Otherwise Execute.
- Forced: Always Execute.



## Option Names?

The hard part.

- Should-Request Predicate
    - `shouldRequest`
    - `shouldDispatch`
    - ... others?
- Lazy/Default/Forced
    - `shouldExecuteFromData`
    - `shouldExecuteForData`
    - `shouldExecuteByData`
    - `shouldExecuteByState`
    - `shouldExecute`
    - ... I dunno.



## More General?

Suppose we store the Previous Request in the Request State?  Then, both of the above can be combined into a single predicate:

```
shouldExecute :: (nextRequest, previousState) => boolean
```

Then to do the above behaviors, we just do:

```js
$store.dispatch('requests/request', {
    key: 'getFoo',
    shouldExecute: allPredicates([
        ShouldExecute.isPathDifferent,
        ShouldExecute.lazy,
    ]),
});
```

The only problem I can see is that we lose default behavior if we only say `isPathDifferent`, because it becomes effectively paired with `force` unless we include special behavior to check if any of `lazy`, `force`, or `isNotWaiting` or whatever.
