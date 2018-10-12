Simple Component Tree Over HyperHTML
====================================

> NOTE: This is still in the silliness/feasibility stage.

HyperHTML claims to be extremely performant in renders, in part due to not having to diff a VDOM to determine DOM mutations; instead it just diffs directly against the existing DOM.

A complication arises then when trying to effectively use `hyperhtml.wire(thing)`: Just what the hell do you put in there for `thing`?
- You cannot use a primitive, because it needs global uniqueness
  - Well, not necessarily global uniqueness, but `thing` plus the second `id` argument must be unique.
- You cannot skip it and use only a string id unless you feel like guaranteeing globally unique string ids.

Granted, for a number of examples, [they just skip wiring to anything altogether](https://viperhtml.js.org/hyperhtml/examples/#!fw=React&example=Basic%20event%20handling), although I'm given the impression that this leads to [always creating new nodes every time it's called](https://viperhtml.js.org/hyperhtml/documentation/?_sm_au_=iDVBnQSHnSs1HRDV#api-1-0).  So, don't call it more than once...

- [proppy](https://www.npmjs.com/package/proppy) Generic prop factories, kinda like recompose but just about props rather than React

What's needed then?

What I want to do is:
- At minimum: calling `flush(app, nextTree)` flushes an update to the DOM.
  - This means basically `nextTree` is a VDOM, albeit at the component level only: it doesn't care about the DOM or templating.  I mean, the dev cares, but nextTree doesn't.

How might that look?  Can we use the included component class or even just functions for ... something?

We know a few things:
- Template Tag Functions receive 2 things:
  - An interned array of strings for a given set of template strings.
  - A set of arguments to be interleaved between the elements of the first, the default behavior being to just stringify each element and interleave them.

HyperHTML of course takes advantage of this for its efficient rendering.  However, because we're dealing with a Template Tag _Function_, we also have access to all the wonderfulness that is Higher Order Functions.  We can wrap `wire()` to do other things with the input before passing it to `wire()` and even do things with the output if we want.  Not so interested in the latter, yet, though.

What can we do with this?  Anything we want.  Concretely, not sure yet.



## Thoughts on Component Trees

Basically I want to eliminate the drudgery of:
- Component Construction and Binding
- Prop and State Updates
- Component Destruction

But still allow things like:
- Integration with 3rd Party Libraries:
  - Mapping prop changes to Imperative API Calls
  - Mapping library events to App Events

Now, from my own standpoint, I don't care if it ends up like React or like Elm/Hyperapp, all I care is that the common tasks are automated, leaving only the interesting bits.


### Thought 1: Just Props

If we take an Elm/Hyperapp stance, all we really care about is:
- Global State
- Existing Props (need something persistent to wire to HyperHTML)
- 3rd Party Lib Integration:
  - Mapping State Changes to Imperative API Calls
  - Mapping Library Events to App Events

What do we know about [how HyperHTML handles things](https://viperhtml.js.org/hyperhtml/documentation/?_sm_au_=iJVkjmLRRrNN23PR#essentials-8)?
- Strings are treated as `textContent`, so we don't care about those: they're already handled.
- DOM Nodes are inserted as is: This is how you can use `wire()`ed content in templates.
- Promises are not rendered until resolved.
  - However, it's better to do `{ html: somePromise, placeholder: 'Loading...' }` because loading states are usually better UX.
  - For more fanciness, you could make the placeholder not render for a moment.
- Arrays:
  - Arrays of Strings are treated as an explicit opt-in for HTML injection.
  - Arrays of DOM Nodes are inserted as is: This is how you use `wire()`es with arrays of content.
  - Arrays of Promises are basically treated as if they were fed into `Promise.all()`, with values of the resolved array inserted in order. (each value treated as being wrapped in `{ any: value }`)
- Objects: Resolved by the properties according HyperHTML's handler registry.
  - Some Pre-defined ones are:
    - `text`, telling HyperHTML to sanitize and insert the listed text.
    - `html`, telling HyperHTML to inject the value directly as HTML.
    - `any`, telling HyperHTML to resolve against this Content Values List.
    - `placeholder`, telling HyperHTML to use this content (according to the Content Values List?) if `html` is a Promise that's not yet resolved.

What could we take advantage of, here?

One thing we could do is have our own Object type, perhaps with a specific Prototype to allow us to pick them out?  We could then go through the Interpolation Values to do this picking out, allowing us to build a Tree that we can diff against:
- Components newly created have to have various setup hooks called.
- Components with new props have to have update hooks called.
- Components that didn't change should have nothing done.
- Components that don't exist in the new tree will have various teardown hooks called.

How much can we get away with not doing?  We don't care about anything necessary to render at a low level because HyperHTML takes care of that.  I think then that most of the trouble will be with arrays.

> Theoretically, you could just encapsulate 3rd party libraries in Custom Elements.  It's not like we care about handing them DOM nodes, they usually handle those themselves.  Just like with ordinary HTML elements, HyperHTML will take care of actually doing all the actual property/event stuff.

First off, where all should we have to check?
- Anywhere we need to check the List
- Arrays

There's also a big problem: Promises... (And they're probably also a good argument for stateful components if we're taking the pragmatism route, otherwise something like what I did with hyperapp async components would work)  I'm not sure how Promises would actually work in full app situations outside of codesplitting.  In small static situations you could put them in directly, otherwise I don't see how it works.

#### Thought 1: Just Props: Arrays?

While I don't think we need to deal with the order of elements in Arrays, we do still need to worry about the existence of them.  `key`s will still help, here.  However, if you don't specify keys, then they'll keyed by index, I guess.

#### Thought 1: Just Props: Actual Implementation

I think under the hood this will end up as a couple steps
- Render our tree
- Diff to previous tree and flush changes
  - Honestly, I'll probably just apply changes during the diff process rather than actually creating a full diff
  - It's during this time that instances are created or destroyed and lifecycle hooks are handled.
- Render to HyperHTML

The second and third step will actually probably be pretty complected.  At the very least, though, we really only have to deal with `wire()`; `bind()` is only called at the root, and basically just puts all the crap we just rendered with `wire()` into the DOM.

I think then we'll have largely two parts: `render` and `patch`.

`render` will basically create something like:

```
{
  el: htmlElement,
  content: {
    strings: [...],
    values: [
      ...
    ]
  },
}
```

`patch` then takes this and does a whole bunch of magical bullshit to flush changes to underlying `bind()` and `wire()` calls.  It has to maintain a tree of actual instances under the hood so that it can do stateful things like hooks.

Aside from hooks, do we really need to do much other than call `wire()` with new data?

What does Render return for a "Component", then?  Presuming of course that by "Component" I mean something closer to what Hyperapp means.

```js
const component = html => (props, children) => (html`
  <header>
    <h1>${props.title}</h1>
    ${children}
  </header>
`);
```

Though, I suppose it should really be more like

```js
const component = html => (props, children) => (state, actions) => (html`
  <header>
    <h1>${props.title}</h1>
    ${children}
  </header>
`);
```

`html` here actually returns `{ strings: [...], values: [...] }`.  Possibly with a specific prototype.  State and Actions are passed in later because we don't have them yet?  That's weird, though, because props are usually derived from state.  If it were later, then we'd be constantly bouncing between props-render and state-render.  Then again, we apply state/actions first, then pass it to the render pass, so maybe these aren't as separated as I'd thought.

Hm...

```js
plainRender = {
  strings: [...],
  values: [...],
}

componentRender = {
  // Mithril style?
  beforeCreate(instance, props, state, actions) {},
  created(instance, element, props, children, state, actions) {},
  beforeUpdate(instance, props, children, state, actions) {},
  updated(instance, props, children, state, actions) {},
  view(props, children, state, actions) {
    return {
      strings: [...],
      values: [...],
    }
  }
}

// Or maybe just the hooks hyperapp exposes?

componentRender = {
  // It occurs to me that these will already
  // close over props, children, state, actions, etc.
  oncreate(node) {},
  onupdate(node) {},
  // not sure how to implement done offhand.
  // { html: Promise<null>, placeholder: oldContent }?
  onremove(node) {},
  ondestroy(node) {},
  content: {
    strings: [],
    values: [],
  },
}
```

Hm.  That last example suggests something: Stateful components are basically rendered content with hooks also specified.  Taking further cues from hyperapp, this also suggests that deeply-tapped state is entirely optional, and that you could just do everything by passing props.

How about list items?  And do we really need that `content` prop?

```js
componentRender = {
  // ... hooks.
  key: 'foo-bar-baz',
  strings: [],
  values: [],
}
```

> NOTE: Do NOT change `strings`!

It's like a VNode but weird.  The intent is the same, though: Describe what we want to show up.

What actually gets passed to the hooks?  The output of `hyperhtml.wire()`?  I think that returns a `NodeList`.  Maybe.

There's still an issue though, and that's what to do about multiple different arrays in the same content set?

##### Arrays in Content

Suppose we have...

```js
const component = html => (props, children) => html`
  <h3>${props.title}</h3>
  <ul>
    ${props.items.map(item => html({ key: item.id })`
      <li>${item.name}</li>
    `)}
  </ul>
  <ul>
    ${props.items.map(item => html({ key: item.id })`
      <li>${item.description}</li>
    `)}
  </ul>
`;
```

I mean, that's certainly doable, just check if the first argument is an object that's not an array...  Hmmmm.

I guess that would make a return value like this:

```js
const componentRender = {
  strings: ['\n  <h3>', '</h3>\n  <ul>\n    ', '\n  <ul>...', ...],
  values: [
    // props.title
    'Two Lists',
    // Result of the first map operation
    [
      {
        // item.id
        key: 'a04mf',
        strings: ['\n      <li>', '</li>\n    '],
        values: [
          // item[0].name
          'Item the First',
        ]
      },
      {
        key: '9kb3t',
        // NOTE: Due to template strings, this will be the
        // same array in memory as for the first item!
        strings: ['\n      <li>', '</li>\n    '],
        values: [
          'Item the Second',
        ],
      },
      ...restOfItems,
    ],
    [
      {
        // item.id
        key: 'a04mf',
        strings: ['\n      <li>', '</li>\n    '],
        values: [
          // item[0].description
          'This is the very first item!',
        ]
      },
      ...restOfItems,
    ],
  ],
}
```

Well, that's something, I guess.  Can we avoid doing much actual child diffing?  Obviously if we don't have keys, we have no choice but to just update by index, and adds/deletes happen only at the end of the list.  Can we avoid doing the order-diffing ourselves for keyed lists, though?

Here's some things we can know due to just template strings themselves:
- If the `strings` array changes identity, it's a different template, and we can assume we're creating a different instance, or at least invalidate any caches.
- If the `strings` array stays the same, the order of the `values` array stays the same, too.

I think we might be able to just punt that to HyperHTML:
- Since `strings` and `values` are related, we can use a change in `strings` to invalidate any local caches.
- Since `values` will always have the same things in the same positions, we can index any array-caches by their position in `values`.
- We can then use this to take care of object identity for list items:
  - For any indexed cache, we track things by key.
  - The keys map to instances in memory.
    - A new key means a new instance.
    - A key not found in the new list means an instance is going away.
  - We can thus use this to track object identity for HyperHTML.
  - We don't care about order, only identity.  HyerHTML takes care of actual ordering.


### Using Other Components

Given the interface of a component here, `html => (props, children) => {...}` (optionally with `state, actions` in there...) we can just render down to vnodes and spit those out directly.  If we wanted to be fancy, we could use `html(SomeComponent, { ...props }, children)` but I'm not sure that's necessary.

If we take into account the simplification below of just importing `html` everywhere, we get `(props, children) => ({...} | (state, actions) => {...})`.  Since components are just functions here, we can call them directly.

Thus:

```js
import html from 'hyperactivehyperhtml'
import cx from 'classnames'

const navItem = (props, children) => html`
  <a href="${props.href}" class="${cx('nav-item', { 'nav-item--current': props.isCurrent })}">
    ${children}
  </a>
`

const nav = (props, children) => html`
  <div class="nav-container">
    <h1 class="nav-title">App</h1>
    <nav class="nav">
      ${props.navItems.map(item => navItem(item, item.label))}
    </nav>
  </div>
`
```


### Statefulness: What About HyperHTML Components?

Another option which might be something to consider: can we thread HyperHTML Components into this for ease of extension and familiarity?  My main complaint about them is that they're still very manual, having to handle all their children and such.  It may be performant, but it's also tedius and annoying, and I'm easily bored.  Er, I mean, I think such low level twiddling should be left to trying to optimize things.

I have to deal with an instance anyway, and that could give an easy way to interface with things that's (probably) familiar to people using HyperHTML.  I don't think I would use them by default, but having them or some variation of them as the stateful interface might be worthwhile...

There's also custom elements, but I feel those are better suited to encapsulating integrations.  They seem to me to be more annoying than not for managing component trees.

I think they would go something like this:
- Rather than HyperHTML's `html`, they receive my `html`.
- `render()` returns something using `this.html`.
- `update(props, state, actions)` handles, well, updates.
- Actually, probably just have support for all the hooks,
  - `mounted(props, children, state, actions)`, and the guarantee that `this.$el` (or `this.$els`?) exists.
  - `update(props, children, state, actions)`
  - `willUnmount(props, children, state, actions)`
  - `unmounted(props, children, state, actions)`

I guess that's basically making HyperHTML into SortaReact.  Heh.

As for special treatment, I guess you'd pass the Component Constructor first to the Main Interface before passing any props.  So, ``return html(MyComponent, { key: 'blah' })`...`;`` then just check if `MyComponent.prototype instanceof BaseComponent`.  That doesn't quite make sense, though, since `MyComponent` has a `render()` function.  So, we should probably just say `html(MyComponent, { key: 'blah', ... })` instead.

So many interfaces.  Bleh.

I guess another good question is: Does this actually add anything that the hooks themselves don't?  If not, why go to the trouble?



## Implementation

So!  Creating vnodes is easy, now the hard part:
- Patching the DOM by calling HyperHTML's `bind` and `wire`.  Mostly the latter, but the former gets called once at the root.
- Converting the entire tree to plain objects (unthunking things, basically)
- Calling hooks and such

Internally, we keep track of a tree of Representative Nodes, which represent the final "rendered" tree of Vnodes.  They are used to track actual instances, array children, etc.


### Patch Inputs

To patch a tree, we need access to a few things:
- The DOM Element to bind to
- The next Root Vnode
- The next State
- The next Actions

The DOM Element, well, nothing much to talk about there.  `document.getElementById('app')` or whatever.  Go wild.

#### On the Root Vnode

The Root Vnode, however, is a good question.  I think it should have one of the following type signatures:
- Props-Only Components: `html => (props, children) => {...}`
- State-Connected Components: `html => (props, children) => (state, actions) => {...}`

Which is basically this:
- `html => (props, children) => ({...} | (state, actions) => {...})`

The use of `html` as the first argument, while interesting, doesn't make sense in the HyperHTML Components view of things.  Maybe we should just import that, same as everyone else does.

That simplifies the type down to:
- `(props, children) => ({...} | (state, actions) => {...})`

Theoretically, with Components, we could have something like
- `(props, children) => ({ component?: C, ...} | (state, actions) => { component?: C, ...})`

Which means that the vnodes we have to deal with will be of this type:
- `{ component?: C, ...} | (state, actions) => { component?: C, ...}`

Updates then would be simplified: You essentially write `mapStateToProps` and `mapDispatchToProps`, and the Component doesn't worry about those extra arguments.  Nice.

So, we'd normalize the given vnode input down to an actual vnode object, then do Patch Vnode.

#### Patching a Single Vnode

Here, we have this:
- `(state, actions, prevVnode, nextVnode) => HyperHTMLNodes`

We don't need to return anything else because after the full patch, we replace the prev vnode tree with the next one.

The simplest cases are when either prevVnode or nextVnode are nullish: This is node creation or destruction.

What's more interesting is when both are actual vnodes.

Then, we do this:
- Are the Vnodes considered Different Types? (TODO: Different Type Determination?)
  - If so, treat this as two operations:
    - Removal of the Previous Vnode followed by the Insertion of the Next Vnode.
  - Otherwise, continue.
- For each (Previous Value, Next Value) pair in the Zip of (Previous Vnode Values, Next Vnode Values):
  - Patch the Previous Value and Next Value in the context of the Previous Vnode and Next Vnode.

To Patch a Previous Value and a Next Value in the context of the Previous Vnode and Next Vnode:
- If the Previous Value and Next Value are both Arrays, assume they are iteration results and perform a Key Aware Array Patch in teh context of the Previous Vnode and the Next Vnode.
- Else, If the Previous Value and Next Value are both Vnodes, merely patch them.
- Else,
  - For the Previous Value:
    - If the Previous Value is a Vnode, perform Removal of it.
  - For the Next Value:
    - If the Next Value is a Vnode, perform Insertion of it.

To perform a Key Aware Array Patch of the Previous Value and Next Value in the Context of the Previous Vnode and Next Vnode:
- Collect what Children will be Removed, Patched, and Inserted:
  - Mark all Children in the Previous Value for Removal.
  - Mark all Children in the Next Value based on their presence in the Previous Value:
    - If a Child in the Next Value was marked for Removal, change that mark to Patch.
    - Else, mark that Child for Insertion.
- Update Children and Next Vnode.

Vnode Difference Determination:
- If Vnodes are both primitive, they are different if they are not identical.  Mostly we don't care, though, because they get flushed straight to HyperHTML.
- Complex Types:
  - A Vnode is an Object Node if it has a Strings array and a Values array.
    - If two Vnodes are Object Nodes, they are the same if their Strings arrays are identical in memory.
  - ... others?  Probably not yet.



## Patch r0 Try 2

Okay, let's try this again.

We have the following features:
- State + Actions
- Components that are either Objects or Functions in the form of `(state, actions) => Vnode`
  - I'm taking inspiration from HyperApp v1, so the render functions aren't going to be completely pure.

We'll have a few different major types to worry about:
- Vnode: These are what all our component code and, ultimately, what our `html` function renders.
- RepNode: These are internal objects that enable stateful behavior:
  - Diffing of Vnodes
  - Stateful Integrations ala Mithril


### Unsupported Features in r0

- Keyed Children.
  - While I have some ideas on how to deal with this drafted above, I'm going to leave support for keys out of the initial sketch to simplify implementation.
- Lifecycle Hooks, although at least a bit of thought will go into how to support them.
  - RepNodes are part of this.
- Context.
- Class Components.


### Vnode Types

Vnodes as we encounter them can take a few forms:
- Plain `Vnode` Object
- Injection Point Function: `(state, actions) => Vnode`
- Plain Intent Object
  - This is any Object which is not a Vnode Object.
- Primitive Values:
  - Strings are inserted as text.
  - Numbers are stringified and inserted as text.

After Normalization, we have only three forms:
- Plain `Vnode` Object
- Plain Intent Object
- Primitive Values

#### Consideration: Unsafe Text

In HyperHTML, a String in an Array is considered an HTML Opt-In.  I think for us, though, it may be better to require any such HTML be more explicit, especially since we're having somewhat different behavior around arrays.  I'll probably require `{ html: '<strong>this is html!</strong>' }` for unsafe injection.

However, there's also this to consider: In HyperHTML, all items in an Array must be of the same Type.  It would be highly unusual for us to have an array of heterogeneous elements, so this may not be a real concern.  I'll just go ahead with current plans and circle back around later.


### RepNodes

RepNodes are constructed and modified behind the scenes to enable diffing and stateful behavior.  Vnodes of different Vnode Types will in turn have different RepNodes, even if they're in the same place.  Vnodes of the same Vnode Type will have the same Rep Node, even if their contents change.

A couple notes:
- Vnodes with different Keys are considered Different regardless of if they're the same Vnode Type.
- Primitive Values do not have RepNodes.

Naturally, RepNodes must track some things to support all this:
- The current Vnode
- The current RepNodeState
- Child RepNodes by Key
  - Note that Child RepNodes could be in the Content Values itself, but are more likely to be in a Sub-Array within the Content Values.



## Other thoughts: Do We Need State/Actions?

I wonder if I could get around obligatory State/Actions?  Tangential, I wonder how a Context API might work.


### On Context

- Vue just lets you directly access `$parent` and `$root`.
- React has `ContextProvider` and `ContextConsumer` to abstract around things.

I think that something Vueish would be more in line with HyperHTML, but what determines `$parent` and `$root`?  Given I'm focusing mostly on functions with optional components, that might not be a good move; Something like the React model is much better (easier) to implement.  I'll worry about that in r1 I guess.

Providing `context` next to `state` and `actions` is probably the best way to go there.



## On "Free" Optimizations: Memoization?

I wonder if there's any way to efficiently memoize things we know won't change... Not really sure, without going full global memoization.
