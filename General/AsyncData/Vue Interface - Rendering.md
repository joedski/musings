AsyncData - Vue Interface - Rendering
=====================================

Unlike in JSX or Hyperscript type setups, in Vue we can't (as easily) just use `AsyncData#cata` to render content.  This is unfortunate, since it means we can't performantly require all cases be handled.  Well, whatever.

The implementation is pretty simple, though has a few caveats, notably that for reasons I don't yet understand, it's best to use `<template>`s for passing content for the slots.

```js
import AsyncData from '@/utils/AsyncData'

export default {
  name: 'AsyncDataCata',

  functional: true,

  props: {
    value: {
      type: Object,
      required: true,
      validator(val) {
        return AsyncData.is(val)
      },
    },
  },

  render(h, ctx) {
    return ctx.props.value.cata({
      NotAsked: () => ctx.slots().notAsked,
      Waiting: () => ctx.slots().waiting,
      Error: (error) => ctx.data.scopedSlots.error({ error }),
      Result: (result) => ctx.data.scopedSlots.result({ result }),
    })
  }
}
```

I thought about calling the scoped slots with just the values themselves, but that would make them weird compared to other Vue components, even if you didn't need to remember a name.  The entire reason I name the error arg to the Error case `error` is so it's the same name; exactly the same reasoning applies to Result and `result`.
