Lazy Loading of Heavy Dependencies in Vue
=========================================

One of the nice things about Vue is that it supports Webpack's Dynamic Imports out of the box, which gives us a way to defer loading as much as possible, which makes things nicer: The user downloads less code and gets things running more quickly.

Doing this with plain components is easy, but how about components which depend on Vue Plugins?



## Working with Plugins

The main issue is that Plugins themeslves do not export components; er, well, I mean, many do, but when used as a Plugin, they don't.  How can we do this, then?


### Spam of Files: A Return to AMD-esque

First, a restriction:
- The things that the Heavy Dependency injects can _only_ be used by the things that actually import it.  Anything else trying to use those things, even though they're installed via `Vue.use()`, will cause an error because they're trying to use something before it's installed!

Broadly speaking, this way requires a few different files:
- The Installer: This is what actually calls `Vue.use()` to install the features used by the Wrappers.
- The Wrappers: These actually use the features installed by the Installer.
- The Wrapper Loaders: These stitch together the prior two items, wrapping them in an Async Component definition.

We end up with something that looks rather like an AMDish mess, but oh well.  There's a reason AMD was what it was.  In fact, we might as well just call this ACD, for Asynchronous Component Definition.  Heh.  Anyway, here's an example using Vue Highcharts:

```js
// installers/VueHighcharts.js
import Vue from 'vue'
import Highcharts from 'highcharts'
import VueHighcharts from 'vue-highcharts'

Vue.use(VueHighcharts, { Highcharts })

// We could export things here if we expected to need them...
```

```js
// components/Highcharts/SomeChart.js

import DefaultLoadingComponent from '@/components/LoadingIndicator'
import DefaultErrorComponent from '@/components/ErrorIndicator'

export default (overrides) => () => ({
  error: DefaultErrorComponent,
  loading: DefaultLoadingComponent,
  delay: 200,
  ...overrides,
  component: Promise.all([
    import(/* webpackChunkName: "installers--vue-highcharts" */ '@/installers/VueHighcharts'),
  ]).then(() => import(/* webpackChunkName: "implementations--charts" */ './SomeChart.impl')),
})
```

```html
<!-- components/Highcharts/SomeChart.impl.vue -->

<template>
  <highcharts :config="chartConfig" />
</template>

<script>
export default {
  props: {
    chartConfig: {
      type: Object,
      required: true,
    },
  },
}
</script>
```

Notice that when using SomeChart, you have to actually call it.  This is done so you can override the async component settings, which is important if we want to maintain flexibility in the face of various UI needs.

Also notice that the `SomeChart.impl` is being shoved into a generic sounding `implementations--charts` chunk.  This is intentional in this specific instance: The Wrappers themselves are likely to be so light that bundling them all together will be more efficient than keeping them separate.  This is of course highly situational, and other Wrappers may be heavier and deserve their own Chunks.

```js
import SomeChart from '@/components/Highcharts/SomeChart'
import DifferentLoadingIndicator from '@/components/DifferentLoadingIndicator'

export default {
  // ...
  components: {
    SomeChart: SomeChart(),
    // alternatively,
    SomeChart: SomeChart({
      loading: DifferentLoadingIndicator,
    }),
  }
}
```

This is annoying, of course.  It'd be better if we could leverage tooling to do this for us.  Never the less, I think this would work.  Given that the _Wrapper Loader_ is basically going to be the same thing over and over again, we could probably autogenerate that from some additional annotations in the _Wrapper_ itself.  Hmm hmm hmm.
