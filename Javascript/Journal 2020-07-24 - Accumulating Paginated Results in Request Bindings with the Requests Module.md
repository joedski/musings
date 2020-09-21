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


### Start From Existing Work

So before we get ahead of ourselves, the behavior I'm thinking about is already implemented in an existing project, albeit in a non-encapsulated, non-abstracted form.

The behavior goes something like this:

- On next response:
    - If page is 0, replace cached data with response data.
    - Otherwise, append response data.

This logic is repeated across the three different list requests (list, text search, advanced search).  Simple, and certainly fits the current use case.  Not much to do.

I don't strictly see anything wrong, but something about it still bothers me and I'm not sure if it's because there actually is something wrong or if it's just NIH Syndrome striking again.

I think it's that rather than "convention" type resets, I prefer explicitly signalled resets.

Or, no, maybe it's because there's nothing in there to prevent mixing response the lists, rather the only way the lists are kept separate is because the component dispatching these actions is careful to always reset to page 0 when ever the search type changes.  I hate when components have to be careful like that, as it's error prone in the face of modifications.

> On that note, while our project has requests for "all", "text search" and "advanced filter search", only "text search" and "advanced filter search" are explicitly called out.  I think I should have an "all" or "unfiltered" case, just to make that explicit.


### How To Abstract?  What's The Core Interaction?

So, what we want here is less "load page n" and more of just "load next page".

In that sense then, maybe what we want is an adjunct controller that uses a Request Binding and does ... something.  `#resetThenDispatchFirstPage()` and `#dispatchNextPage()`?  maybe we pass in the search into there?

The original reset things by going to page 0, but I don't want to track that state in my components because that's just something every Accumulating Paginated Thingy has to do.

So, the above two methods should work then:

- Every time the search changes, we map that to `#resetThenDispatchGetFirstPage(this.currentSearch)`
- Every time we need more data (usually because we reach the rendered last page), we map that event to `#dispatchGetNextPage(this.currentSearch)`.

That should be everything we need, then.

- The component using AccumulatingPaginatedThinger knows when to call each method.
- The AccumulatingPaginatedThinger itself knows what page it's on, and calls the request binding.



## Accumulating Paginated Request API

How do we do this, then?  Wrap a RequestBinding?  Or only use it internally?


### Wrap a RequestBinding

This is more explicit, but also noisier.  The indentation and noise alone may be too much.

```js
export default {
  computed: {
    appSearchRequest() {
      return new AccumulatingPaginatedRequest(this,
        getPagination => new RequestBinding(this, () => {
          const pagination = getPagination();

          if (this.appSearch.search.type === 'filter') {
            return getAppsByFilterSearch({
              body: this.appSearch.search.search,
              page: pagination.page,
              pageSize: pagination.pageSize,
            });
          }

          return getAllApps({
            page: pagination.page,
            pageSize: pagination.pageSize,
          });
        })
      );
    },
  },
};
```

Oof, the pyramid is making me a bit dizzy.  This is one certainly one reason in favor of compose/pipe/decorators: less indentation.


### Internal RequestBinding, Pass Request Creator Only

In that sense, this is probably better?  Certainly we don't have to worry about other use cases yet, and one tenet of mine is to build specific first, generalize later.

```js
export default {
  computed: {
    appSearchRequest() {
      return new AccumulatingPaginatedRequest(
        this,
        pagination => {
          if (this.appSearch.search.type === 'filter') {
            return getAppsByFilterSearch({
              body: this.appSearch.search.search,
              page: pagination.page,
              pageSize: pagination.pageSize,
            });
          }

          return getAllApps({
            page: pagination.page,
            pageSize: pagination.pageSize,
          });
        }
      );
    },
  },
};
```

That seems pretty good, actually.  It's not really any less indented, but at least it's less noisy.

If we need the ability to specify the first page or page size, we can add options.

```js
export default {
  computed: {
    appSearchRequest() {
      return new AccumulatingPaginatedRequest(
        this,
        pagination => {
          // ...
        },
        {
          firstPage: 1,
          pageSize: 200,
        }
      );
    },
  },
};
```


### Prop Shorthand?

```js
export default {
  computed: {
    appSearchRequest: AccumulatingPaginatedRequest.prop(
      function getRequest(pagination) {
        // ...
      },
      {
        firstPage: 1,
        pageSize: 200,
      }
    ),
  },
};
```

Tricky, requires a plain function because we need to be able to change `this`.



## Persistence Across Refreshes

One thing we'd like to do is persist these across refreshes.  To do that, we need some sort of state external to the component.

This means either something like local storage or Vuex.  Either that, or we need some way to delegate such storage.  Maybe we have a generic KV Store interface one instance is a LocalStorage or SessionStorage backed KV Store while another is a Vuex KV Store.  Hm.

And then we come back to the question of Route-based storage, giving us a Session+Route-Based KV Store.  Hmmm.

Or Vuex+Route for that matter.  Hmmmmmm.
