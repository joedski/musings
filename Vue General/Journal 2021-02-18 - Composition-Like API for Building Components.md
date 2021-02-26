Journal 2021-02-18 - Composition-Like API for Building Components
========

What if... build components like composition API but, like, done stupid instead of well?

Similar enough to confuse.

```js
component(() => {
  const $props = props({
    show: { type: Boolean },
    title: { type: String, required: false },
    groupId: { type: String, required: false },
  });

  const formState = data('formState', () => ({
    selection: [],
  }));

  const selectionIds = computed('selectionIds', () => (
    formState().selection.map(el => el.id)
  ));

  const requestBody = computed('requestBody', () => ({
    selectionIds: selectionIds()
  }));

  watch(
    () => $props.show(),
    () => (next, prev) => {
      if (next && ! prev) {
        formState({ selection: [] })
      }
    }
  );

  // Don't need to return anything because the template already sees things
  // by their names above.
});
```

The main thing to notice is that values are indirected via functions.

- Read-only can only be called with 0 arguments.
- Read-write can be called with 0 or 1 arguments.

This circumvents the awkward `reactiveThingy.value` that the Composition API deals with by just rubbing in your face that these are getters.  This makes them more like Flyd or Mithril streams than other reactive things.

The generated components would be terrible to behold raw code wise, but so are compiled templates so whatever.

Names are there so that you can actually see them in the Vue dev tools.  Use them.  Yes I know they're redundant but it's literally 1 extra string.



## Implementation thoughts

```js
function props(propDefs) {
  const getters = {};

  for (const [propName, propDef] of Object.entries(propDefs)) {
    getters[propName] = prop(propName, propDef);
  }

  return getters;
}

function prop(propName, propDef) {
  mutateComponentOptions(options => {
    options.props = options.props || {};

    options.props[propName] = propDef;
  });

  return function getProp() {
    return // ...?
  };
}
```

Yeah, that getter is the crux of the issue.

So the thing is that the function handed to `component()` creates just the Options.  It's only run once.  The getters are thus also generated once... But they have to be able to operate in each separate component instance.  That's the issue.

Or, does it have to be an issue?

If the function passed to `component()` is treated as a pure definition function only, no side effects (that aren't carefully wrapped), then we should be able to run it as many times as we want.

Specifically, we can run it N+1 times:

1. 1 time to create the initial component options object.
2. 1 time each component instantiation.

The former is just to define the component interface at run time and is what happens when the function is called immediately, while the latter is to create actual running code and is when the function is called during `beforeCreate`.

So, the first time basically nothing would happen.

Any subsequent times, the functions created have actual concrete implementations.

The above `getProp` thing would look like this, then:

```js
function prop(propName, propDef) {
  mutateComponentOptions(options => {
    options.props = options.props || {};

    options.props[propName] = propDef;
  });

  return injectComponentInstance($vm => {
    return function getProp() {
      return $vm[propName];
    };
  });
}
```

I suppose it could be argued that you don't even need to create the Options object, then, but again, I like being able to see things in the Vue dev tools.

This would also give us another interesting thing:

- Because of the different times at which it gets called, we can easily detect when the returned getters are called, and thus create appropriate error messages to hopefully help diagnose issues.

Nice.


### Cannot Call Once Due To Async

It'd be nice if we didn't have to call the component configurator function every time, but it's basically inevitable because we need to create different function references for each component instance.

Why can't we just set a context every time we enter a given components' own copies?  Async, basically.

Context magic depends on syncronous execution to ensure consistent global state.  Once you start throwing in asynchronous execution, that road is closed, you've released the nasal demons.
