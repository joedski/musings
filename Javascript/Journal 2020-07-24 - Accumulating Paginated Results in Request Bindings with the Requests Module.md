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
