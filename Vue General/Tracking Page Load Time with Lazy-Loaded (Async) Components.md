Tracking Page Load Time with Lazy-Loaded (Async) Components
===========================================================

Outline of Thought:

- Create wrapper for Lazy-Loaded/Async Components
- This Wrapper adds/wraps Loading State Component to do the following:
    - Upon being mounted, it emits to a global event bus an event indicating loading has begun.
    - Before being destroyed, it emits to a global event bus an event indicating loading has finished, although of course it cannot say just why loading finished.
- A top-level controller then keeps both a counter and tracks the current route.
    - The counter is incremented each load-begin event, and decremented each load-end event.
    - Each time the counter reaches 0, the time delta between first increment and reaching 0 is the Page Load Time, and that is then emitted, along with the current Route.



## Edge Case: User Navigates to Another Route Before Current Route Finishes

This is a bit hairy of a situation.

Usually, one would assume that any components being unmounted would be unmounted first, and thus any Load-End Events should occur before any new Load-Begin Events.  I'm not sure that's guaranteed, though.  It probably is, but who knows?

To handle this case, though, the following may be done:

- Each Route being tracked has its own associated Count.
- The Counts for Older Routes are always decremented first, until they reach 0.
- Once a Count reaches 0, the Time Delta is calculated and a Route Loaded event is fired for that Route.

In total, then, we have this model for tracking:

- Route Loading Record:
    - Route
    - Datetime Navigated To
    - Count

And the following behaviors:

- On Navigate To Route:
    - Create new Route Loading record.
- On Component


### Edge Case in This: No Components Register a Count

To handle cases where either there are no Async Components or where someone forgot to wrap the Async Components, the following is recommended:

- When the next Route is navigated to, wait 2 Ticks
    - NOTE: A "Tick" here means a render cycle.
        - In Vue, for instance, you might do `Vue.nextTick().then(() => Vue.nextTick()).then(handleTimeout)`.
    - If the oldest Route is still at 0, assume it synchronously loaded and report a 0-time-delta load time for that route.

This should work since any Async Components that would mount should mount after 1 Render Tick.



## How to Use In Pure Functional Frameworks

I'm not entirely sure how you do Async Components in Pure Functional setups, so eh?  Probably something with a custom monad that just a tuple of the actual render output and a "still loading" count.
