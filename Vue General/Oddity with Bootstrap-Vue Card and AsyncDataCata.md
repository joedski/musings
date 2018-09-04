Oddity with Bootstrap-Vue Card and AsyncDataCata
================================================

I've run into an oddity when using my usual `AsyncDataCata` functional component:

```js
import { AsyncData } from '@/mixins/AsyncDataMixin'

export default {
  name: 'AsyncDataCata',
  functional: true,
  props: {
    asyncData: {
      type: Object,
      validator: d => AsyncData.is(d),
      required: true,
    },
  },
  render: (h, ctx) => ctx.props.asyncData.cata({
    NotAsked: () => ctx.slots()['not-asked'],
    Waiting: () => ctx.slots().waiting,
    // Done to support cases where you don't care
    // about the value itself.
    Error: error => (
      ctx.data.scopedSlots.error
        ? ctx.data.scopedSlots.error({ error })
        : ctx.slots().error
    ),
    Data: data => (
      ctx.data.scopedSlots.data
        ? ctx.data.scopedSlots.data({ data })
        : ctx.slots().data
    ),
  }),
}
```

Specifically, using in this template here:

```html
<b-card>
  <!-- not quite sure why, yet, but this outer div
  is required or else <b-card> won't render the results
  of <async-data-cata>.  Without it, the not-asked and waiting
  cases are not rendered unless the <div>s are replaced
  with <template>s.  error and data cases are just fine
  with <div>s for whatever reason. -->
  <div>
    <async-data-cata :async-data="liveChartData">
      <div slot="not-asked">Not asked...</div>
      <div slot="waiting">Waiting...</div>
      <div slot="error" slot-scope="{ error }">Error! {{ error.message }}</div>
      <div slot="data" slot-scope="{ data }">
        {{ JSON.stringify(data.map(([x, y]) => [x, y.toFixed(2)])) }}
      </div>
    </async-data-cata>
  </div>
</b-card>
```

As stated in the comment, the outer `<div>`, `not-asked` and `waiting` must be specified using `<template>` tags, `<div>`s will not work for them.  However, with the outer `<div>`, using `<div>` for those two cases workes fine.
