Journal 2019-04-01 - Simple Async Function Subscription Controller
==================================================================

A micro-utility: Subscription Management Service Controller for polling an Async Function on a given timeout.

- Standard pub-sub.
- Can call poll function on subscribing.
- Can immediately poll function on demand.
- Timeout for next call is set after function settling.
- Specify resolution and rejection handlers.

I don't think I'll worry about deduplication/single-function-many-subscribers yet.  Theoretically it should be easy to do, though, either by function-identity-checking or by pre-registration of poll functions.

Limitations for now:

- No variable timeout:
    - Not going to bother with timeout decays.
    - Not going to bother with timeout randomization.
    - This could be easily done, though, by just supporting generator functions.
- No deduplication, as mentioned, though that should be pretty easy to add.
- No optionally ending a subscription on rejection.
    - It's a small thing, but eh.

Other considerations:

- Should probably not restrict it to async.
    - That is, if it doesn't return a Promise, then we should immediately call the callbacks.
    - Fortunately, we can just `await` on it and it will automatically do the desired behavior.  _Nice_.
        - It will be a slight difference in behavior, of course: Any time you await on promise resolution, it's kicked into a microtask.  That's what we expect here, but it is something still to note.

Some Edge Cases:

- `#poll()` is called while the Poll Function is in the middle of its task.
    - Hm.  There's a couple possible ways to go about it.
        1. Make sure only the latest call is taken into account.  i.e. track which promise is the current one.
        2. Skip new calls if one is already in progress.  i.e. if a current promise exists, then do nothing.
    - I think the better way, despite potentially increased spamminess, would be the first option there.



## Implementation Thoughts


### Implementation Thoughts: Subscription

- Pass a Poll Function and Options.
    - Options include things like:
        - Interval (in ms)
        - Whether to call immediately or not
        - ... stuff?
- Returns an ID in a similar manner than `setTimeout` returns an ID.


### On Broadcast Subscriptions

The current setup works very well for single-cast.  Given that, I'm not sure I want to have broadcast built into it, as that adds extra stuff into there that I just don't care to have in this core behavior.

I think then that broadcast can be put into a separate thing that delegates actual polling to the `AsyncPollingController` and itself just handles the Deduplication part.

Of the not-implemented things, that's the only thing I can think of that actually should be shunted off to its own thing.

Considerations:

- What to actually deduplicate on?  Some sort of name or other key?  Function identity?
- How to track that?  Define subscriptions up front and then sub/unsub by name/key?  Just checking the function itself?

Name is probably easier, but strictly speaking, the way you interact is basically the same:

- Subscribe by passing in the Identifier (key or function) and handlers, receive a Subscription Id.
- Unsubscribe by passing in the Subscription Id.

There's still separate subscription IDs to track because each point of use needs to be able to drop its own subscription without touching others'.  Alternatively, do the RX style thing and return a function or object with a method which when called unsubscribes.  Same thing, different flavor.  In one case you track an ID yourself, in another you track a function or object which closes over the ID.

The object provides the best extensibility, while the ID theoretically provides the same by delegating that extensibility to the Controller.  Granted, functions in JS are also objects, so technically the Function form also provides the same extensibility at the cost of being mildly funky.

Anyway.  This is a separate item from the `AsyncPollingController` thingy, so it's fine.
