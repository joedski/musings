Journal 2020-08-12 - Vue Components as Stream Implementation (Why Wait For Composition API?  Besides a Cleaner Interface, I mean)
========

This is possibly dumb.

Suppose we built a Stream/Reactive type dealio, that was basically just a funny way of creating a Vue component.  That is, Vue component creation with rxjs/kefir/most/whatever style operations, but not geared towards creating visual components but rather creating reactive streams that use Vue's reactivity system as the underlying execution engine.

So you might do things like...

```js
export default {
  computed: {
    allFooData$() {
      return VueStream(this).of(() => this.fooRequest.response)
        .scan(
          RefreshableData.reduction,
          AsyncData.NotAsked()
        )
        .map(responseRefreshable =>
          responseRefreshable.lastData.map(response => ({
            page: response.request.params.page || 0,
            data: response.data,
          }))
        )
        .scan(
          (allPages, nextDataPageData) => nextDataPageData.cata({
            NotAsked: () => allPages,
            Waiting: () => allPages,
            Error: () => allPages,
            Data: ({ page, data }) => {
              const nextAllPages = allPages;
              nextAllPages[page] = data;
              return nextAllPages;
            },
          }),
          []
        )
        .map(allPages => allPages.flatten())
        ;
    }
  }
}
```

> Note: It may not be safe/possible to actually do this in a computed prop.  This is provided as an example.  That said, it's lazy, and nothing actually happens here until something accesses `allFooData$.value`, so there should be no initialization issues.  Probably.

`.pipe()` is cleaner but more verbose so whatever.  Value would be accessed via `.[get value]` or `.value()`.  Not sure there's a difference in practice.

Behind the scenes then we'd do the usual stuff to set this up:

- Each `map` just sets up a computed prop, essentially.
- Each `scan` sets up a `watch` on the base stream's value and a `data` for the scan state, then with that `watch` updates another `data` for the result state.

If it weren't for having to actually react to changes, we could get away with just computed, but because of `scan` pretty much, we have to be able to have `watch`.  `computed` is strictly for mapping, and doing anything else with it can be, well, tricky.

I'm not sure we could optimize things to only create one component per parent.

Regardless, we can't really avoid creating streams in the context of the current component because we want streams to be tied to the lifecycle of the current component, hence `VueStream(this)`, or however I might do it.  Maybe `VueStream.for(this).of(...)`?  Or just `VueStream.of(this, ...)`?  Dunno.

> There's also the question of whether or not we even need a component, or if we can just use `this.$watch` and `Vue.observable({})` for everything.  Hm.
