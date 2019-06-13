Journal 2019-06-07 - Requests and Subscription Refreshes - Waiting Until After Both
========

Situation:

- I have a Request.
- I also have a Subscription which performs some other async operation. (it's also just a request, here.)
    - Some Subscription ID is tracked in the Store, as are the Results of each Subscription Polling.
    - No other information is available.
- After the Request, the Subscription is immediately polled.
- I want to do something after both the Request and the next Subscription Polling.

Thoughts:

- Ability to add one-time handlers to Subscription by Subscription ID.
- Wait one time for Subscription Result to change to some Setlled State, then resolve.

The first one, as much as it revolts me, is probably the cleanest.  It requires no manipulation of or interation of any sort with any sort of store, which makes it the most agnostic plan.  It adds some bloat, but maybe that was inevitable anyway.

Not sure if it should cover both resolve and reject in one go, or how that should work, let alone how that should work with one-time handlers.  For now, I only handle resolutions and just don't do anything on rejection.



## Anything Better?

As far as better solutions?  Hm.

Someone else pointed out that this is sorta getting close to a pub/sub/observable-subject or other similar thing.

I guess if we have to implement too many more, then maybe I should consider refactoring to just use RxJS or some streaming based thing.  Most is fast, but requires too much setup to just use.  Kefir is very large, though still quite fast.  RxJS is only 4kB after minification, and it looks like 7.x is maybe trying to be even smaller?

Also more people have probably heard of RxJS than Most, Kefir, Bacon, et al.

Technically, we could just have a Subject that we push Add/Remove/Whatever events into and get back an Event Stream that has Everything in it.  Basically, represent the controller as a Scan.

That sounds simultaneously neat and annoying.  It might be more useful to leave some object-with-methods thingy as the exposed API and just have the ability to get some kinda Stream for a given Subscription.


### Example: Vue-Based Solution

If we assume that actual DOM rendering is the heavy part and that Vue instances themselves are actually relatively light weight (just, yanno, don't go crazy, same as any non-trivial class), then in a Vue project we can just use Vue Instances as Subscription Objects internally.

This nets us a few things:

- Free event system: `on()`, `once()`, `off()`
- Reactive updates: When the poll function resolves or rejects, we could just emit an event... or we could update a Data prop and use a Watch to trigger the Events.  Whether or not that's a good idea depends on whether or not you need the last resolution/rejection.

Obviously, if your project uses some other reactive system, you can just use that as the underlying thing.
