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
    1. [A couple extensions for Axios][rs-1-1]
        1. Not sure how this would help with local storage since it deals with Responses rather than just the Data on them.
        2. I suppose to do what we wanted to here with Local Storage, we'd have to do some special Serialization/Revivification work to ensure we're creating a new Response, and it would _not_ have the underlying XHR object, I think.  That's just too much.
        3. I also would avoid caching Errors.
        4. [The `cacheAdapterEnhancer`][rs-1-1-4], which is basically what we want, save for the lack of `localStorage` usage.
2. Service-Worker Centric
    1. [MDN Article: Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)
3. Axios Source References:
    1. [Construction of Axios' `response` object in the XHR Adaptor][rs-3-1]
4. XMLHttpRequest Stuff:
    1. [XMLHttpRequest.responseType][rs-4-1]

[rs-1-1]: https://github.com/kuitos/axios-extensions#cacheadapterenhancer
[rs-1-1-4]: https://github.com/kuitos/axios-extensions/blob/master/src/cacheAdapterEnhancer.ts
[rs-3-1]: https://github.com/axios/axios/blob/283d7b306ce231f092d28e01713905e5c1600d14/lib/adapters/xhr.js#L50 Construction of Axios' response object in the XHR adaptor
[rs-4-1]: https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/responseType



## Digging into Axios

Doesn't look like there's a class or anything for Axios' response object, it's just a POJO.  This means a couple things:

- Good: I can just construct it on the fly.
- Bad: I have no way to know if it'll stay that way.
- Meh: Still can't serialize/deserialize the `request` prop since that's implementation specific, though in a Browser it'll probably be an XHR.  Probably.

It seems, then, like this should work for caching:

- Shallow-copy Response object and delete `request` prop.
- Cache that.
- Hope no one needs the `request` prop.


### On Serializing the Request Object

> Current status: Just not doing this, but it was fun to think about?

I suppose if I wanted to, I could copy some easy-to-serialize props, like:

- `responseText` ([if `responseType` is `''`, `'text'`, or `'json'`][rs-4-1])
- `responseType`
- `responseURL`
- `status`
- `statusText`
- `timeout`
- `withCredentials`

And, of course, a `__isSerializedPartialResponseObject: true` property just to tell other devs what's up.

Given that that's going to change between Node and Browser, I'm not sure if it's worth even bothering.  To wit, nothing in our code touches it since everything useful is already on the Axios Response.

The vast, vast majority of the time, we don't even touch anything on the response other than `data`, so, eh.



## Actual Caching Considerations

So, the next fun part: When to invalidate?

I think for now I'll discard any thoughts about TTLs and focus solely the current case: When the requested entity's ID does not match the stored entity's ID.

I'm not sure if there are any cases where we use a property other than `id`, but it would be prudent to allow for such a case, I think.

This gives us two parts, then:

- We need to extract the ID from the URL
- We need to extract the ID from the cached entity, if any

Given that, then, we have this:

- Given ID from URL, ID from Entity
    - If no ID from Entity:
        - Cache Miss.
    - If ID from URL and ID from Entity do not match:
        - Cache Miss.
    - If ID from URL and ID from Entity match:
        - Cache Hit.

Then:

- On Cache Miss:
    - Invalidate Cache Entry.
    - Request Entity.
    - Cache Response.
- On Cache Hit:
    - Do not make Request.
    - Use Cache Entry for Response.



## Actual Usage

The caching should be opt-in.  I'm not sure yet if I want to have it globally applicable or just point-of-use-opt-innable, but basically I'll need three things either way:

- Cache Key: A unique key for this cache entry.
    - Mostly I don't feel like trying to pick apart URLs.
- Requested Entity ID: The ID of the given entity expected in this request.
- Entity ID Extractor: A function to extract an ID from the payload data.

There's two ways I can think of to go about this, as mentioned above:

- Point of Use: The caller passes extra options to Axios to parametrize the caching.
    - Caller passes in the Cache Key, Requested Entity ID, and Entity ID Extractor.
- Globally Applicable: The global configuration maintains separate configuration about what to cache.
    - Cache Configuration specifies URL Parser which can get both Cache Key and Entity ID, and the Entity ID Extractor.
    - Alternatively: Cache Key + URL, no need to extract ID nor parse said URL, only check for matches, which is easier to write.

The former seems easier to work with, though not by much, but the latter keeps all caching concerns out of the store.  In either case, there's more config, but one keeps all the config in one place.

I think I'll go with the former, but with some configurability from the former, for one simple reason:

- Sometimes, you have to abuse a more general endpoint to get the specific data you want.  Not always, but sometimes you do.
    - Usually it's hitting a Collection endpoint to pick out a specific Item.
    - In such a case, then, the Point of Use should be able to hint to the caching system with, say, an Entity ID or something, some additional side-band information anyway, to determine when to invalidate the cache.

I'm going to do this by adding support for a new Request Config Option: `entityCache`.  It's symmetrical with the name, for one thing.

```typescript
interface EntityCacheRequestConfig extends AxiosRequestConfig {
  entityCache?: {
    key?: string;
    entityId?: string | number;
  };
}
```

While this might at first seem to eliminate global config, it actually makes it down right simple:

- Pass the `AxiosRequestConfig` through a list of Config Transformers.
    - If one transforms the Config, stop at that one and return the transformed Config.
- If `entityCache` is on the Config, then Do the Cache Thing.

Thus, a clean way to have my cake and eat it too.
