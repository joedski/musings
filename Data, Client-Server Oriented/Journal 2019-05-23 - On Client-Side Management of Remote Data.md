Journal 2019-05-23 - On Client-Side Management of Remote Data
========

Essentially, when managing Client-Side State to track Remote Data, don't organize things in terms of Business-Oriented Domains.  Rather, remember what you're actually building here: A small framework for managing remote data, its status, etc.

Not much else to say there, really.  When using a central store, it should be its own subsystem which manages its own top-level slice.  When using a multi-store setup, it should have its own store.

Take for example Apollo.js, which uses its own internal Redux store for its state management.  However, it also gives use the option of using a slice of your own Redux store instead of its own internal store.  In either case, though, it's a slice of state that is oriented entirely towards the purpose of managing requests, remote data, responses, etc.

Some key points arise from this:

- Instead of `fetchFoo`, `deleteBar`, `updateBaz`, you get `request('fetchFoo')`, `request('deleteBar')`, etc.
    - Or in the case of Apollo.js, a GraphQL Query Fragment.
- Instead of thinking about how you divide up your state for each request, you have a central, uniform state slice which holds all requests.
    - This allows for uniform derived functionality to be built on top.



## On AsyncData and RefreshableData

AsyncData is a natural representation of any given request, but what about when we need to be able to track something with refreshes?  Say, statuses that we periodically poll.

RefreshableData is basically a quad of AsyncData instances:

- Current
    - The instantaneous AsyncData value.
- Last Settled
    - The last Data or Error AsyncData value.
- Last Data
    - The last Data AsyncData value.  It could be any of the other tags, but once there's at least one AsyncData.Data value, it pins to that until a newer one comes.
- Last Error
    - The last Error AsyncData value.  Same logic as Last Data, but applies to the Error case instead.

This is quite a bit to hold, though, and honestly isn't really needed most of the time.  So what's a good way to deal with optionality?

The first thing that comes to mind is to make it a separate module: Instead of `request(someRequest, ...)` you have `requestRefreshable(someRequest, ...)`.  That would allow a globally managed RefreshableData state, which would itself depend on the base AsyncData state.

The second thing that comes to mind is that many times this isn't necessary to hold in the global state, it can be simply held in some component's local state, if that's a thing you have.  Naturally, in pure functional contexts, that's not a thing, so global state is the only state, but in imperative contexts it means you don't need to worry about resetting anything.
