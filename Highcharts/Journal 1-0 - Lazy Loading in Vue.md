Lazy Loading in Vue
===================

> AMD-Vue: Webpactic Boogaloo

Like any comprehensive library, Highcharts is very large and really cramps our ~~style~~ bundle size.  Here I'll detail my thoughts and explorations trying to lazily load it using Webpack's chunk-splitting on dynamic import and Vue's built in support for that.

So, let's say we're trying to really keep the initial bundle delivery slim.  In that vein, we want to defer loading of Highcharts until absolutely necessary, which means we want to put it off until we show a chart.  In fact, we want to defer loading Highcharts even if its on the current page.

Vue can be extended at any time, although we can also just not bother and do the extension all locally as I believe all that Vue Highcharts does is stick a component in at the top level.  There's no real need to bind everything globally.  Here I'll be exploring ways I can defer loading Highcharts, taking advantage of Vue's and Webpack's support for dynamic imports.



## Async Components

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
  // Too many changes.
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

// Since this is in the module definition, it gets applied only once.
Vue.use(VueHighcharts)

// ... nothing else!

// @/vendor/Highcharts/Highcharts.vue

export default () => ({
  component: () => import('./HighchartsInstall').then(() => ({
    // ...?
  })),
})
```

Something like that?  Needs some more thought.
