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
