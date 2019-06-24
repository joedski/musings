Journal 2019-06-24 - Managing Subscriptions in Vuex
========

How to manage subscriptions in Vuex, keeping in mind that there could be multiple types of subscriptions, say polling vs SSE vs Websockets?

If we take a cue from Requests and Permissions, then we can break Subscriptions down into two main parts:

- The Vuex interface and state management: Active Subscriptions, their last Data/Error, etc.
- The keyed Subscription Definitions

For Subscription Definitions, then, there's some other parts to worry about:

- What Subscription Controller is used?
- What is the Subscription?
    - In all likelihook, this will almost always depend on the answer to the above question.
        - A Poll Subscription will be a Request to make.
        - An SSE Subscription and Websocket Subscription will be an Application-Specific Message Event Determination.
        - Etc, etc.

In general, I think this can be managed by just having every controller make a Create Subscription Definition thingy available that outputs some wrapper in a standard interface.

As for underlying implementation?  An RxJS Subject or a Vue Component would be good examples, as they allow for subscription to events and can manage the Subscription State, leaving the general Data State to Vuex.  The Subscription Controller would then just create one for an active Subscription.

There are a few operations I can think of for Subscriptions:

- Subscribe: Open a new Subscription.
- Unsubscribe: Close an existing Subscription.
- Refresh Now: Immediately issue a request to refresh the subscribed data.
- Update Subscription: Update the parameters of an existing Subscription.
- Reset State: Delete existing store state for a given Subscription.
- Add Message Handler
- Add One-Time Message Handler
- Remove Message Handler
- Add Error Handler
- Add One-Time Error Handler
- Remove Error Handler

Admittedly, the Remove Handler ones probably aren't that commonly used.
