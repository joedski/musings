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

While I don't think we need to deal with the order of elements in Arrays, we do still need to worry about the existence of them.  `key`s will still help, here.

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
