Journal 2019-11-20 - AsyncData of 4 States vs 3 States + Result
========

AsyncData has 4 possible states representing the 4 different states of an Asynchronous Value/Calculation:

- NotAsked: The value/calculation has not yet been requested.
- Waiting: The value/calculation has been requested, but is not yet done/received.
- Error: The calculation terminated with an error.
- Data: The calculation terminated with a value.

This mirrors the 4 states of a Promise:

- NotAsked: The Promise hasn't been created yet.
- Waiting: The Promise has been created, but has not yet settled.
- Error: The Promise settled in the Rejected state.
- Data: The Promise settled in the Resolved state.

However, one could also analyze this another way:

- NotAsked: The value/calculation has not yet been requested.
- Waiting: The value/calculation has been requested, but is not yet done/received.
- Settled: The value/calculation terminated with some result:
    - Result.Success: Value from successful calculation.
    - Result.Error: Error occurred during calculation.

That is to say, AsyncData is no longer a tagged sum of 4 states, but:

```
data AsyncData d e =
    | NotAsked
    | Waiting
    | Settled (Result d e)
```

Why might this be better?  Well, it removes the need to handle both the Data and Error states from the AsyncData type.

On balance, though, it punts it to the Result type so eventually you'll have to deal with the fact that you may need to handle both the Success and Error cases.

But, it could be argued that the Result type itself is more general and thus its behavior is well defined already.

I think about the only case where this makes most sense is if you're also doing potentially-failing mappings on AsyncData, which would normally have to be done with Flatmap, but with a separate Result type would be done using only Map.  Granted, you've moved the Flatmap to Result.Flatmap inside the AsyncData.Map, so, there you go.
