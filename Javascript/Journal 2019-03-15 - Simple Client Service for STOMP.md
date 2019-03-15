Journal 2019-03-15 - Simple Client Service for STOMP
====================================================

Thoughts and sketches on creating a simple service for a SPA based on a STOMP Client.  Some details may be biased by the needs of whatever project I'm on, so no guarantees of generality.

My thought is this:

- Only open a single transport connection.
    - We'll be using SockJS, here, but it doesn't really matter, STOMP takes care of multiplexing among many other things.
- We'll use a singleton service that itself controls the STOMP client.
    - Deals with creating new Subscriptions, queuing Subscriptions for re-creation-on-reconnection, etc.
    - Deals with queuing messages if a message is posted while the connection is down. (CHECK: Does the STOMP client already deal with this?)
- Other parts of the App can then interact with that Service Singleton:
    - Get Topic Subscriptions.
    - Send Messages to Topics.
    - Whatever else it is you do with STOMP connections.

The most important part, I think, is the management of Subscriptions.  Sending can be done by, well, anything, so that's not that big of a deal.  I think.  It's mostly just the queuing bit, there.  Probably.  Hah hah.

Obviously, this is a very low level piece of machinery.  It should hopefully provide enough to be easy to use, but not get in the way of doing Important Things.  It should also still give the ability to directly access the STOMP Client just in case you need to do low level things.

Some things I probably won't focus on right off, usually because my current use case doesn't need them:

- Transactions.  Use the STOMP Client directly for that.
- Binary Bodies.  More of a configuration thing than anything.

Some considerations:

- Subscriptions.
    - What to do when `Client#deactivate` is called?
        - Initial thought: Leave all current Subscriptions in the Subscription List, so that the next call to `Client#activate` will re-create them.
- Queued Messages.
    - What to do when `Client#deactivate` is called?
        - Initial thought: ... not really sure.  I could see arguments for either case of clearing the message queue and preserving it.  I guess make it an option.
