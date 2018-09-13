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
