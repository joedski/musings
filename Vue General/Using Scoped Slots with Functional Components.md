Using Scoped Slots with Functional Components
=============================================

Scoped slots are basically the render props of templates.  Not quite as flexible as a render prop, but in _most_ cases, they'll serve you better than a render prop.  Most cases.

Now, I'm not going to explore what cases a render prop is better, because I'm not actually sure; I'm just assuming for now that there may be some cases which exist where a render prop is better.  Rather, here, i'm going to focus on how to use scoped slots in functional components and render functions.

1. [Vue's docs on render functions and functional components](https://vuejs.org/v2/guide/render-function.html#Basics)
2. A Codepen showing [how to specify a scoped slot in render function, as well as how to use it](https://codepen.io/autumnwoodberry/pen/jwjMEj)

The short of it is this: Use the [Data Object](https://vuejs.org/v2/guide/render-function.html#The-Data-Object-In-Depth).  If you're ever in doubt about where things in the [Functional Render Context](https://vuejs.org/v2/guide/render-function.html#Functional-Components) are, check `context.data`.  This also goes the other way: If something is expected on the Data Object, it probably gets put there when you make the call to `createElement`.

> NOTE: For brevity, I will always rename `createElement` in my render functions to `h`, because `h` is much shorted.  It comes from the usual naming of a hyperscript function.



## A Component That Accepts Scoped Slots

Here's a bare example of a component that takes a scoped slot:

```js
export default {
  name: 'AcceptsScopedSlot',
  props: {
    title: {
      type: String,
    },
  },
  render(h, ctx) {
    return h('div', [
      ctx.data.scopedSlots.header({ title: ctx.props.title }),
      ctx.slots().default,
      ctx.slots().footer,
    ])
  },
}
```

A stupid example, but illustrative.



## A Component Supplying a Scoped Slot

```js
export default {
  name: 'UsesScopedSlot',
  data() {
    return {
      title: 'Title!',
    }
  },
  render(h) {
    return h(
      'div',
      {
        // Scoped slots are each defined as a function.
        scopedSlots: { header: ({ title }) => h('strong', [title]) },
        props: {
          title: this.title,
        },
      },
      [
        h('div', { slot: 'footer' }, ['Footer stuff!']),
        h('div', ['Content!']),
      ],
    )
  },
}
```
