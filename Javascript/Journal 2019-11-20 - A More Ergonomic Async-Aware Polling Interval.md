Journal 2019-11-20 - A More Ergonomic Async-Aware Polling Interval
========

Suppose: a polling interval where the next poll call doesn't occur until both the previous poll settles then after that the timeout elapses.

That is, then sequence of events would be thus:

- Poll-Callback is called.
- Poll-Callback resolves. (or rejects)
- Interval Timeout begins.
- Interval Timeout elapses.
- Repeat...

How might this be best modeled in an rxjs friendly manner?

Hm.

So, the interval-timeout can be modeled with a `sleep` function which is basically a promise on a timeout elapsing, so if we go that route we can model all of them by just using `sleep` and the poll callback as two async functions we cycle between.

In one sense, we could then say "Given n functions, call function 1 and await on it, then call function 2 and await on it, then ... call function n and await on it, then call function 1 and await on it, then..."

In another, that's too early a generalization and we really want just "call poll callback and await on it, then call sleep and await on it, then call poll callback and await on it, then..." with the reasoning that if we want to add extra switching later, we could.

Of course, a fair question might be to ask if it even matters to any further processing just which one of the above methodologies is used.  The answer is probably "no", so I'm not sure I should care too much and could probably just use a cycle thingy for now.

It could be considered that the barest set of IO for this is:

- Inputs:
    - Calls to Poll Immediately
    - Start Polling (Poll Immediately: Yes/No)
    - Stop Polling
    - Reset State
- Outputs:
    - Updates:
        - Poll Settlement: (Result: Success (Data) / Error (Error))
        - Sleep Timeout: ()
    - Subscription State: (...?)
    - Data Updates: (AsyncData (Data, Error))
