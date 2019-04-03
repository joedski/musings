Journal 2019-04-03 - Transparent Request Caching, Featuring Axios
=================================================================

There are only two truly difficult things in computer science: Cache Invalidation and Naming Things.

I'm looking at the former, here.

Specifically, in a Vue app using Vuex and Axios.  Those details are incidental, though.

I've got a few thoughts on where such caching should be, and none of those thoughts are where such caching is currently implemented:

- Sometimes access of the cache is in the view, sometimes in the store.
    - I disagree with this methodology for multiple reasons:
        - The cache key and parsing and checking of the cached value is handled everywhere a cache read occurs.
        - Usually no error handling, which would have to be repeated everywhere.
        - Checking for cache misses (however unlikely they are to be) is sporadic or, more usually, non-existent.
        - It complects the View-Model logic with caching, something completely orthogonal to it.
- Caching is a form of optimization.
    - Adding it early is a form of early optimization.
- Cache setting is in the Store, while the thing being cached is actually request data.
    - This complects store data-fetching logic with caching.
        - I think this is utterly unnecessary,
        - And repeatedly puts the same code (or more likely slight variations thereof) all over the code base.

So, obviously, I disagree with how it's currently done.  What to do, then?

I'd still like to have this since it'd make the UX during page refreshes nicer.  Theoretically it'll reduce load on the server, but honestly I think that's pretty negligible unless we implement caching for almost all requests.

- Since this is requested data, caching should occur at the request level.  Make it transparent to the Store and everything that layers atop that, data wise.  Mostly, that's the View sitting atop the Store.
- I can think of two ways to do that:
    1. Wrapping or Modifying Axios:
        1. Could finagle Axios into caching requests somehow.  Not sure how that works with Responses or Errors, regarding Local Storage, but something could be worked out.
        2. Wrap one layer above that and deal only with the Data itself rather than Requests.  This would require changing how we interact with Axios more than the first option, though.
    2. Intercept Requests with a Service Worker:
        - This is more complicated for a few reasons:
            - Services workers are not (yet?) universally supported, though they may be supported enough as to not care.
            - More complex by dint of being yet another moving part.
            - Cannot access Local Storage directly, must access via Post Message.
        - But it does have some nice benefits:
            - No finagling Axios, works with things other than Axios.
            - Deal only with the response data itself.

Research:

1. Axios Centric
    1. [A couple extensions for Axios](https://github.com/kuitos/axios-extensions#cacheadapterenhancer)
        1. Not sure how this would help with local storage since it deals with Responses rather than just the Data on them.
        2. I suppose to do what we wanted to here with Local Storage, we'd have to do some special Serialization/Revivification work to ensure we're creating a new Response, and it would _not_ have the underlying XHR object, I think.  That's just too much.
        3. I also would avoid caching Errors.
2. Service-Worker Centric
    1. [MDN Article: Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)
