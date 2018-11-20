Rendering Issues with Non-Scoped Named Slots
============================================

As of Vue 2.5.17, I keep running into an issue using functional components and non-scoped named slots: Unless the content is wrapped in a template, it does not render.  I've posted [a comment on an existing issue](https://github.com/vuejs/vue/issues/8878#issuecomment-440014742) also noting this, and created a [codesandbox thingy](https://codesandbox.io/s/7yx4zl839q) to also demo a bunch of cases.  I would've just used jsfiddle, but they don't let you lock Vue to a specific version, which means Results May Vary.  Not good for trying to demo a possibly-version-specific bug.

Digging into the returned VNodes, I see the following results.

First, with no template-slot:

```
Render Template:
  transition[name=overlay-fade]
    my-functional-component
      div.busy-overlay[slot=waiting]
        spinner

VNode: transition[name=overlay-fade]
  tag: 'vue-component-19-transition'
  children: undefined
  componentOptions:
    tag: 'transition'
    children: [
      VNode: div.busy-overlay[slot=waiting]
        tag: 'div'
        data:
          slot: 'waiting'
        children: [
          VNode: spinner
            tag: 'vue-component-25-spinner'
            children: undefined
            componentOptions:
              tag: 'spinner'
        ]
    ]
```

Second, with template-slot:

```
Render Template:
  transition[name=overlay-fade]
    my-functional-component
      template[slot=waiting]
        div.busy-overlay
          spinner

VNode: transition[name=overlay-fade]
  tag: 'vue-component-19-transition'
  children: undefined
  componentOptions:
    tag: 'transition'
    children: [
      VNode: div.busy-overlay
        tag: 'div'
        data:
          slot: (not present)
        children: [
          VNode: spinner
            tag: 'vue-component-25-spinner'
            children: undefined
            componentOptions:
              tag: 'spinner'
        ]
    ]
```

The only real difference I see, then, is that in the former case, the `div` has `data.slot = 'waiting'`, while in the latter case the `div` doesn't have `data.slot` defined at all.  Hmmm.  My guess is that this somehow causes the parent component that's actually calling the functional component to try to throw stuff into the slot.

I wonder if the parent does things with that?  Besides not render it, I mean.

Nope, it does nothing.  Maybe the transition component is eating it because transition doesn't have a `waiting` slot?  Indeed that seems to happen: If I remove the `transition` component from the tree and put in the `my-functional-component` directly into the parent (no components, only plain nodes wrapping the functional component) then the content appears as expected.

How to solve this?  Well, getting clear direction about how to use functional components would be nice.  Having something fixed in the framework itself would be better.  In the mean time, there are ways to work around it:
- Just always wrap slot contents in `template`s.
    - This is annoying, especially when things stop working the moment you forget to do this.
- Write a function to normalize slot contents for use in functional components.
    - Not the best option, and honestly a bit of a hack: I'm kinda weary of anything which plays with the VNodes in such a calavier manner.  It's also maybe a slight performance degredation.
        - Actually, the fact that anything is identified by the Chrome Dev Tools as a VNode means their instances of a class, which means cloning isn't straight forward.
            - I mean, technically, it could be...  (`Object.assign(Object.create(vnode.constructor.prototype), { ...vnode, ...overrides })`) but that's just asking for trouble later.
    - The upside is that it makes the functional component more bullet proof, usage wise.
