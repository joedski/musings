Lazy Loading in Vue
===================

> AMD-Vue: Webpactic Boogaloo

Like any comprehensive library, Highcharts is very large and really cramps our ~~style~~ bundle size.  Here I'll detail my thoughts and explorations trying to lazily load it using Webpack's chunk-splitting on dynamic import and Vue's built in support for that.

So, let's say we're trying to really keep the initial bundle delivery slim.  In that vein, we want to defer loading of Highcharts until absolutely necessary, which means we want to put it off until we show a chart.  In fact, we want to defer loading Highcharts even if its on the current page.

Vue can be extended at any time, although we can also just not bother and do the extension all locally as I believe all that Vue Highcharts does is stick a component in at the top level.  There's no real need to bind everything globally.  Here I'll be exploring ways I can defer loading Highcharts, taking advantage of Vue's and Webpack's support for dynamic imports.



## Base Considerations and Ideas


### Async Components

The most basic form of the Async Vue Component is this:

```js
// Exporting directly.
export default () => import('./ThatThereComponent')

// Using locally.
export default {
  name: 'ThisUsesAnAsyncComponentLocally',
  components: {
    LocalComponent: () => import('./ThatThereComponent'),
  },
}
```

But there's also a more advanced form which should certainly be considered, especially so the user has some feedback:

```js
// Extra stuff.
import LoadingIndicator from '@/components/LoadingIndicator'
import ErrorIndicator from '@/components/ErrorIndicator'

// Just showing direct export form:
export default () => ({
  component: import('./ThatThereComponent'),
  loading: LoadingIndicator,
  error: ErrorIndicator,
  // How long do we wait before actually showing the loading component?
  // It's best not to show loading immediately or else the user may see a bunch of
  // flashes of loading indicators followed by content popping in.
  // Too many changes makes it feel slower.
  // Default is 200ms.
  delay: 200,
  // How long do we wait before assuming loading failed and we just show an error?
  timeout: 3000,
})
```

In either case, we can combine this with Webpack's chunk name stuff:

```js
export default () => import(/* webpackChunkName: "that-there-component" */ './ThatThereComponent')
```

This in mind, we can do something like this:

```js
// @/vendor/Highcharts/HighchartsInstall.vue

import Vue from 'vue'
import VueHighcharts from 'vue-highcharts'

import Highcharts from 'highcharts'
// Also any extras we want...

// Since this is in the module definition, it gets applied only once.
Vue.use(VueHighcharts, { Highcharts })

// ... nothing else!

// @/vendor/Highcharts/Highcharts.vue

export default () => ({
  component: () => import('./HighchartsInstall').then(() => ({
    // ...?
  })),
})
```

Something like that?  Needs some more thought.



## Actual Interface

What should be done, then?

Some thoughts:
- Just create our own Highcharts wrapper component that passes props straight down to it, and exports as an async function that imports the installer?
  - Doesn't quite work, the installer itself is a Vue Plugin, not a separate set of components.
  - This is why the above thoughts had the `() => ({ component: () => import(...).then(...) })` form.
- What we could do then is depend on module execution/instantiation only occurring once (many things depend on this being the case; singletons, global config, etc.) and just have all charts import that, and just have all the charts themselves be async imports that go into the same `webpackChunkName`.

### Examples

#### Example of the Second Thought

Files:
- `@/components/Charts/`
  - `InstallHighcharts.js` The file that configures and install Highcharts.
  - `VMStatsChart.vue` Wrapper for a preconfigured chart.
  - `VMStatsChart.impl.vue` Underlying implementation of a preconfigured chart.

File: `@/components/Charts/VMStatsChart.vue`

```js
// Extra stuff.
import LoadingIndicator from '@/components/LoadingIndicator'
import ErrorIndicator from '@/components/ErrorIndicator'

// Just showing direct export form:
export default () => ({
  component: import(
    /* webpackChunkName: "app-charts" */
    './VMStatsChart.impl'
  ),
  loading: LoadingIndicator,
  error: ErrorIndicator,
  // How long do we wait before actually showing the loading component?
  // It's best not to show loading immediately or else the user may see a bunch of
  // flashes of loading indicators followed by content popping in.
  // Too many changes makes it feel slower.
  // Default is 200ms.
  // delay: 200,
  // How long do we wait before assuming loading failed and we just show an error?
  // In this case, I'm not actually sure because Highcharts is pretty damn huge.
  // timeout: 3000,
})
```

File: `@/components/Charts/VMStatsChart.impl.vue`

```html
<template>
  <div class="chart--vm-stats">
    <resize-observer @notify="$refs.chart.chart.reflow()" />
    <highcharts ref="chart" :options="chartOptions" />
  </div>
</template>

<script>
// Ensure highcharts components exist.
import './InstallHighcharts'

export default {
  name: 'VMStatsChart',
  //...
}
</script>
```

File `@/components/Charts/InstallHighcharts.js`

```js
import Vue from 'vue'
import VueHighcharts from 'vue-highcharts'

import Highcharts from 'highcharts'

// Since this is in the module definition, it gets applied only once.
// For now, we're using just the base Highcharts; Highstock is extra.
Vue.use(VueHighcharts, { Highcharts })
```

It's a couple extra files, but at least then we can just do `import VMStatsChart from '@/components/Charts/VMStatsChart'` and use it without extra work elsewhere.  A little repetition at definition time saves a lot elsewhere, and this pattern hides the fact that they're async at all from anything else, which is probably the best part.

Hm.  It's actually kind of annoying that, in the chart implementation files, we still have to import the highcharts things.  It makes more sense to handle that at the async-component level, I thin.  That means our async-component wrapper looks like this instead:

```js
export default () => ({
  component: import(
    /* webpackChunkName: "app-charts" */
    './InstallHighcharts',
  ).then(() => import(
    /* webpackChunkName: "app-charts" */
    './VMStatsChart.impl',
  )),
  // TODO: Do we need loading/error indicators?
  // loading: LoadingIndicator,
  // error: ErrorIndicator,
})
```

That makes the component implementations themselves cleaner: They have no traces of async loading in them.  Excellent.
