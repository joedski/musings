Journal 2022-06-30 - Thoughts on Stateful Request Bindings
==========================================================

What if we have Request Bindings with parameter state?  As opposed to just sticking the parameters in `data()` and being done with it, that is.

So you'd do `this.fooRequest.params.blah = 'blah'` and that would trigger an update, as opposed to `this.fooParams.blah = 'blah'` doing the same before.

Basically, internally it would have it's own `params` state that is exposed and could be written to or replaced, mostly so you wouldn't need to bring your own state.



Paging, Sorting, and Cache Invalidation
---------------------------------------

Paging would have to be separate I think, just due to caching.

`this.pagedFooRequest.page = 0` and `this.pagedFooRequest.pageSize = 10`, etc.

Do we even have a coherent caching story on these things?

- Params -> Invalidate Cache
- Page -> Update Cache
- Page Size -> Invalidate Cache
- Sort -> Invalidate Cache

Basically updating the cache is the exception.

Sort: `null | Record<String, 'asc' | 'desc'>`

where `null` is the same as the empty Record `{}`.

There's a bit more to this than just the above: Each page must be tied to its specific state request, and each next page request must override the previous.

We can't really cancel the previous, and don't actually want to either in this particular case.  Rather, the previous should be allowed to ride things out and update the cache.

The issue is that, when working with a global cache, that global cache can only handle 1 promise at a time, hence to cache multiple pages the global cache would also have to cache each of those requests separately.

This in turn leads to an issue because the request binding must be able to somehow hook into the beforedestroy hook of the component, something that can't really be done without a mixin.  And that's why the composition API is superior.

The easiest option honestly is to just forget about the global cache in this case.  We may even want to evaluate if we really want the global cache in most cases, or if it's just better to rely only on local?

Hm.

```typescript
interface RequestBindingData<P, R> {
  cache: AsyncData<R, Error>[];
  state: Reactive<RequestBindingState<P, R>>;
}

interface RequestBindingState<P, R> {
  createRequest: (requestParams: P & { params, page, size }) => AppRequest<R>;

  params: P;
  page: number;
  pageSize: number;
  sort: Record<String, 'asc' | 'desc'>;

  // computed
  get requestForPage() {
    const { createRequest, params, pageSize, sort } = this;

    $requestBindingData.cache.length = 0;

    return function $requestForPage(page) {
      return createRequest({
        ...params,
        page,
        size: pageSize,
        sort,
      });
    };
  };

  get currentRequest() {
    return this.requestForPage(this.page);
  };
}
```
