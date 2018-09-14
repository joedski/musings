Lazily Loaded Views in Hyperapp V1
==================================

[hyperapp](https://github.com/jorgebucaran/hyperapp) (specifically V1 in this case as, as of writing, V2 was not yet released) is a minimal elm-esque functional-by-default-but-pragmatic-when-absolutely-necessary UI framework that, being elm-esque, includes state management out of the box.  It's also only ~1kB itself, so your app code may very well be bigger than it.

In hyperapp, then, it's expected that you'll store all relevant state globally and, some weird DOM bits aside, that is the single source of truth.  However, element lifecycle hooks are provided because you really can't expect every 3rd party library to stick to a pure functional style.



## The Methods


### Initial Whack: Any Means Necessary

Since JS is not a pure language, we'll just attack the problem head on using all the dirtiness necessary to make it work.  From there, we'll look into ways of making less impure, although I'm not sure there's really a completely pure way to do this.

- Actions must always return a state fragment.
  - Returning `null` or `undefined`, an empty object, or the input state, makes an Action a No-Op.
  - NOTE: Returning the whole state is the recommended way for outside integrations to get access to the hyperapp app's state.
- Actions are where Side Effects can be triggered, and they can themselves trigger other Actions Later.
- Actions are the only way to cause State Updates, and are thus the only way to trigger Redraws.
  - NOTE: A No-Op Action results in that state slice not being updated.  If the entire state atom is not updated, no Redraw is done as it is assumed that nothing actually changed.

The thought goes like this:
- A Lazy Component checks the State for a Render Function as specified by its render-key.
  - NOTE: In hyperapp parlance, Lazy Component means "Component in the form of `(componentProps) => (state, actions) => Node`"
- Behavior depends on the status found therein:
  - No entry for render-key: Not Asked.  Treated as Loading, but used to initiate said loading.
  - Loading: Renders the Loading state.
  - Error: Renders the Error state.
  - Success: Renders the Render Function found therein.

In this way, a given Async Component should only ever be fetched once, and cached thereafter.

Now, this seems like a bit much to specify each time we want to use an Async Component, but we really only have to specify it in the component code itself as a Lazy Component.  Then, anything else using it can treat it as just another Lazy Component.

> NOTE: Functions cannot be serialized to JSON, but that's fine: This slice of state should not be serialized anyway.

#### Concern: Requesting the Same Component Multiple Times

My initial thought here is that, if multiple parts of the render function try to load the same component, they'll overwrite each other with separate updates to the same component key.  Mostly, I think it'll give us multiple attempts to call the same action in quick succession.  Depending on the circumstances, this could be quite annoying.

> NOTE: This isn't about trying to prevent multiple calls to the same `import()` call since Webpack will take care of that.

Since multiple action calls in the same render pass are isolated and do not get an updated state due to a new render pass having not yet taken place, the only way to have calls which affect each other is to have some sort of shared state.  Further more, since we cannot depend on the internal machinery of hyperapp itself, we have to engage in some shared state shadiness.

To keep track of an active request to a given component, I added a mutable `Map` on the state slice.  It's placed on a special key that will hopefully never conflict.  (That can be solved of course by using Symbols, but then state object updates become an issue...)

> Why stick mutable shared state on the immutable state atom?  Because I don't want to use a global cache if I don't have to.  I'd prefer this cache be local to a given app, even if the chances of conflict across apps is vanishingly small.

Since the render pass is what actually triggers a call to `load`, I put the conditional action call in there, leaving the conditionals out of the actions themselves.  That should make any additional extension, if necessary, easier to do.

#### Never the Less, It Works

It was simple enough to implement in a few hours.  From there, the usage is also [pretty simple](./src/components/someComponent.js):

```js
import { h } from 'hyperapp'
import { AsyncComponent } from '../asyncComponentUtils'

export default AsyncComponent(
  'SomeComponent',
  () => import(/* webpackChunkName: "someComponent" */ './someComponent.impl'),
  {
    renderLoading: () => h('div', { class: '--loading' }, '(loading our component...)'),
    renderError: (error) => (
      h('div', { class: '--error' }, [
        'Error! ',
        error.message,
      ])
    ),
  }
)
```

Note that the underlying component is actually implemented in `someComponent.impl.js` while the publicly facing async component is at `someComponent.js`.

#### What Could Be Better

I feel like the `showLoading` thing is a bit weird.  It's sorta random, really.  Given that component definitions are more or less static, though, I'm not sure what to do about that.  Certainly this that the behavior is undefined if multiple Async Components use the same Key but different Delays.  Of course, if they use the same Key, you're also saying they have the same Render function, which may not be what you're thinking...

Also, currently, delay is always at least 1 microtask long.  Not sure if that's ideal or not.

Then, there's rather obviously the use of shared mutable state (which is embedded _within_ the immutable state!), and the dependence on that updating immediately and imperatively.  That's proooobably not going to lead to any sort of hard to debug issues.  Probably.

The main blocker, I think, is just the initial triggering of the loading.  After that, as long as calling any of our main actions (`load`, `await`, `showLoading`, `succeed`, `error`) with the same args results in the same next state, it should be fine to hammer on them.  That said, some of the utilities in Hyperapp V2 may make this nicer, mostly thinking of `debounce`.  Granted, I would need an argument-sensitive debounce, but anyway.

The easiest way to do this would, of course, be to have the async-loads tied to route changes, as that's probably the main use case for Async Components.  That makes it much less generalized, but much more purifiable.

#### What Did Work

As noted above, the actual definition of an Async Component is very short, no weirdness for the End User aside from one additional key on the State and Actions.  After that, the components are used just like any other Lazy Component: `h(SomeAsyncComponent, { ... })`.  Don't think I took Children into account since usually any Async Component will have its own children, and those Children are the entire reason it's being made an Async Component in the first place.  Still, passing down any Children might be a nice thing to do.

The fact that this is a general solution that can be used anywhere makes its adoption into projects and libraries very simple.  Add to that how its state is in the global state atom and you get to see the status for each component.  Nice.


### Considering The Above: The Shared Mutable State

One thing I never checked, and was the entire reason for adding that Mutable Map, was whether or not the state was actually updated after an action call; that is, by the time the next Bound Action is called, is the state already updated even if a Redraw has not yet occurred?  That would seem to make sense, but I never tried it.

To rectify this, I can poke around with [their v1 counter example](https://codepen.io/jorgebucaran/pen/zNxZLP?editors=0010).

Since my thing triggered an action on render, I'll just do that: trigger one action twice per render.  In the action body, it will report the current state it receives, then return an incremented state value if the value is odd. (`v % 2 === 1`)  This should prevent runaway render loops.

```js
const state = {
  count: 0,
  other: 0,
}

const actions = {
  down: value => state => ({ count: state.count - value }),
  up: value => state => ({
    count: state.count + value,
    other: state.other + 1,
  }),
  upOther: value => state => {
    console.log(state)
    if (state.other % 2 === 1)
      return { other: state.other + 1 }
    return state
  },
}

const view = (state, actions) => (
  actions.upOther(),
  actions.upOther(),
  <main>
    <h1>{state.count}</h1>
    <button onclick={() => actions.down(1)} disabled={state.count <= 0}>ー</button>
    <button onclick={() => actions.up(1)}>＋</button>
  </main>
)
```

The comma operator strikes again.

In the console, I see this on initial draw:

```
Object {
  count: 0,
  other: 0
}
Object {
  count: 0,
  other: 0
}
```

When I click on the `+` button, this happens:

```
Object {
  count: 1,
  other: 1
}
Object {
  count: 1,
  other: 2
}
Object {
  count: 1,
  other: 2
}
Object {
  count: 1,
  other: 2
}
```

Since each up is called twice, there's 4 calls total because the first render pass calls it two times, and then as state did chance, the second pass calls it two more times.  At that point, however, the state has settled and so the render thrashing stops.

Notice that only the first state object is different, though, while the other three are the same.  This tells me that the state atom is updated internally immediately, such that the sequencing of actions is important, and that actions themselves do always receive the most up to date state.  This means the mutable map is unnecessary!

I can refactor to not use that, then.  I'm not sure if this is actually intended or just an implementation detail, but it makes a certain amount of sense.


### Considering the Above: Calling Actions on Render

I'm not sure this is entirely avoidable, since basically I have to trigger some sort of action in reaction to rendering itself.  Maybe there's a cleaner way to couch it, but as of now I can't think of anything that doesn't ultimately boil back down to "call action then return view"  I suppose theoretically a view could be wrapped to be allowed to return an array of items or something, and any arrays-of-functions left over would be considered collections of effects to call.  Hm.  Tricky because arrays are already allowed as non-top-level things, and functions are probably likely to be treated as Lazy Components by the default renderer.

Still, if I managed that somehow, that would make things more debuggable:
- All On-Render Effects would be collected at the top level and run in sequence there.
  - Order is technically completely deterministic, but it may be easier to just assume only local order is deterministic.
- Because they're collected at the top, they can then be easily inspected at the top.

A compromise would be easier to implement, though:
- Views can, on render, call an Action to schedule an Effect.
  - This adds an Effect to the Effect Queue.
- Doing this at least once also schedules an Effect Execution Pass, to be run after rendering is completed.
  - This is done by using Next Tick or Next Micro Task (Promise Resolution.)
  - The downside is that it means they may run after changes are actually flushed to the DOM, but I'm pretty sure that's happening already.

This would at least make things more debuggable:
- Wrap `app()` to wrap all `actions` in loggers before handing them off to `app()` itself.

Whereas the current methodology of directly calling actions means we just have to trust that they'll work, and state is actually being updated part way through a render pass, potentially multiple times.  Granted, this does not affect the render pass itself due to using immutable behavior for the state atom, but it's still kinda weird.
