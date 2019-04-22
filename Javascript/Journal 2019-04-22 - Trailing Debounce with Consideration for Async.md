Journal 2019-04-22 - Trailing Debounce with Consideration for Async
===================================================================

Debounces generally come in two flavors: Leading and Trailing.  You can also do both, but most cases I've seen call for one exclusive-or the other.  In this case, I'll be considering only Trailing Debounces.

The specific case I'm thinking about is this: Call a remote API to perform Async Validation on User Input.

Synchronous Trailing Debounce has 2 states, each with one transition when a Next Call is made, giving us this simple State Machine:

1. No Prior Call is waiting on Timeout.
    - A Next Call is made:
        - Set a Timeout for Next Call.
        - This puts things in State 2.
2. A Prior Call is waiting on Timeout.
    - A Next Call is made:
        - Clear Timeout to discard Prior Call.
        - Set a Timeout for Next Call.
        - This puts things back into State 2.

In Asynchronous Trailing Debounce, there's an extra state to consider:

3. A Prior Call was executed and is now Pending.

There are a few ways I can think of to address this:

- When a Next Call is made whiile a Prior Call is still Pending:
    1. ... then immediately set a Timeout for the Next Call without doing anything about the Prior Call.
        - Plain Trailing Debounce.
        - With this, it's entirely possible that the Next Call may end up being executed and then may subsequently resolve while the Prior Call is still pending!
        - However, this is the simplest to implement, and may be fine depending on the use case.
    2. ... then queue that Next Call to execute when both the Prior Call has Settled and when the Next Call's Timeout elapses.
        - Trailing Debounce with Queuing.
        - This guarantees ordering and separate settlements, but could potentially delay the settlement of the Next Call for Awhile.
    3. ... then discard the Prior Call and set a Timeout for the Next Call.
        - Trailing Debounce with Replacement.
        - This guarantees only 1 settlement, and effectively merges the Async Pending time into the Timeout of the Debounce.
        - While with `fetch()` at least, this won't actually cancel the Prior Call to the API, it will ignore the Prior Call's settlement.

For the particular use case under discussion above, I think 3 is the best choice.

> Aside: If you're paying attention, you may notice we actually have 2 separate pieces of State in our State Machine: a Timeout is set or not set for a Prior Call; and a Prior Call is Pending.  This means we have a matrix of 4 actual possible states.
>
> However, in method 3 mentioned aboved we can avoid one of those states: the State of having one Call Pending _and_ having a Timeout Set for another Call.

That decided, we now have this State Machine:

1. No Prior Call is waiting on Timeout.
    - A Next Call is made:
        - Set a Timeout for Next Call.
        - This puts things in State 2.
2. A Prior Call is waiting on Timeout.
    - A Next Call is made:
        - Clear Timeout to discard Prior Call.
        - Set a Timeout for Next Call.
        - This puts things back into State 2.
3. A Prior Call is Pending.
    - A Next Call is made:
        - Discard Prior Call.
        - Set a Timeout for Next Call.
        - This puts things into State 2.


