Journal 2020-07-24 - Accumulating Paginated Results in Request Bindings with the Requests Module
========

At the moment, I'm approaching this from a purely component-side direction as I don't yet see the need for a store-based solution when you could just make a globally available accumulating request binding instead.  Compose your services and all that.

Also because it makes cache invalidation easy: component removed?  Bye-bye cache.  Want to save that cache?  Add that extra mechanism yourself because most components don't need it. (or do they?  Probably not.)

The idea is simple in theory:

- The request binding in some way knows about the current page of the request.
    - This might be via special methods that load the next page, or load a specific page, or by extracting the page from the request config after request-config creation.  Haven't decided what's most ergonomic yet.
- The request binding then caches locally in its internal state the AsyncData of each page, switching which one it updates based on the current page.
    - In the dispatch-parameter methodology, the current page is internal state.
    - In the extract-from-request-config methodology, the current page is always just in the request config and is thus derived state.
        - This might be more in line with what I'm trying to do with it, which is computed props as much as possible, and as little own-state as possible.
- The request binding must know how to map the data to an array of records.
    - This is so the request binding itself can expose its own data prop as an array concatenated from all the pages' data.
- The request binding uses the request key to determine when it needs to invalidate cache and start over.
    - This is so you can also automatically switch requests, but assumes that different requests have different data types since they frequently do.
    - This can be overridden of course by simply giving all requests the same key + page.

I'm leaning towards adding an option to extract the page param after the fact, if only because it's easiest to add on to the existing behavior and keeps things most similar to a pipeline of `Stream<Event> -> Stream<Request> -> Stream<Data>`, it just adds another separate map on `Stream<Request>` to go to `Stream<PageNumber>`.



## Aside: Extend Request Binding or Make Separate Controller?

It's worth asking if we even need to modify/extend RequestBinding for this, if we couldn't just somehow compose the functionality together some other way... Hm.  Analysis requried on the parts required to implement, because I'm not entirely sure the RequestBinding itself needs to be extended.

That said, given that streams wise RequestBinding is a pair consisting of the Sink "Dispatch Request" and the Source "Request Data" along with some ancilliary bits like RefreshableData (derived from Source "Request Data"), anything that adds behavior around the two will need to derive from/to 1 or both of those streams.

The proposed Accumulating Paginated behavior requires deriving from the "Request Config" stream that feeds into the Sink "Dispatch Request", and then also deriving separately from Source "Request Data".



## What Data Flows are Needed?  Using the "Page Number From Request" Modality

Putting aside how the data will be presented, we'll assume that the "Accumulated Data" is separate from the original "Request Data".  That might be easier to conceptualize anyway.

Since I want to go with the "Page Number From Request" modality, I'm going to need what request each data came from.  Thus, to start with, we want to maintain a tight correlation between Data and Config, and the only way to really do that is to have Data _with_ the Config.  One data structure already has that combination, and that's the `AxiosResponse`, so we'll use Source "Request Response" instead of just Source "Request Data".

So, `AsyncData<AxiosResponse> -> AsyncData<{ page, data }>`, which is to say `AsyncData.map (AxiosResponse -> { page, data })`.

We then feed that to `Stream.scan RefreshableData.reduction AsyncData.NotAsked` and just `Stream.map (.lastData)` and feed that into `Stream.scan thingThatSticksPagesTogether` then `Stream.map Array.flatten`.
