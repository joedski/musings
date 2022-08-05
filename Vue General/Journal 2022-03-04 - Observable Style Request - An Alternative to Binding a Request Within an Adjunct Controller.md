Journal 2022-03-04 - Observable Style Request - An Alternative to Binding a Request Within an Adjunct Controller
================================================================================================================

Honestly, this might just me shuffling names around from a previous proposal.  Maybe that'll help frame things better mentally though?

> don't mind the method names, I'm just sketching things.
>
> Also, a lot of this finagling is obviated by the composition API so eh.  Config API only really works in minimal cases and basically necessitates eagerly breaking components into tiny Components to manage things that should be managed by tiny Controllers which get composed into a bigger Controller for a given Component.
>
> Though you should still write smaller Components where possible.

What is a request in a reactive system?  Or rather, how is it handled?

```
input$
|> map(postSearchFooBar) // convert inputs to request description
|> executeRequest() // map a request description to a finite stream of request-related events
|> flattenLatest() // flatten that into the current stream
```

The `executeRequest()` part can really be thought of as a tiny lil scan that includes some side effects.

- State:
    - Data: `AsyncData<T, E> = NotAsked`
- Updates:
    - Request Config Change: `State.Data = Waiting`
    - Request Resolves: `State.Data = Data<T>(response)`
    - Request Rejects: `State.Data = Error<E>(errorOfResponse)`

Putting aside whether the Result-like Data/Error duality should be at the level of AsyncData, that's pretty much it.

```js
export Vue.extend({
  data() {
    return {
      searchParams: {
        ...whatever,
      },
      // Don't forget RefreshableData.scan for better refresh support.
      searchRequest: Observable.readableFrom(() => this.searchParams)
        .map(postSearchFooBar)
        .map(executeRequest)
        .flattenLatest(),
    };
  },
});
```

Of course, why you wouldn't just return that from a computed prop is another matter entirely.

Or, maybe what's needed to make it more vue-ishly ergonomic is to have the input parameters available to assign to?

So like,

```js
export Vue.extend({
  data() {
    return {
      // handles the observable stuff.
      search: Request({
        initParams: () => ({ ...whatever }),
        requestFromParams: postSearchFooBar
      }),
    };
  },

  computed: {
    listState$() {
      return this.search.lastData.map(listStateFromAsyncData);
    }
  },

  methods: {
    handleSearchFormSearch(event) {
      // Kick off a request by altaring the params.
      this.search.params = event.searchParams;
    },
  },
});
```

Dunno.
