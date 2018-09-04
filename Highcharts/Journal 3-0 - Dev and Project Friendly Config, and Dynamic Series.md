Highcharts: Dev and Project Friendly Config, and Dynamic Series
===============================================================

One thing I've run into while working with Highcharts is that it's difficult to properly document chart configs when a given semantic piece of the config may be controlled by multiple settings across multiple areas.

Stepping back a moment, the Config can be thought of as a reified output artifact, sort of like how CSS could be thought of as the reified output artifact of SCSS or LESS or some other CSS preprocessor.  In that sesnse, then, it would make more sense to store a config as a composed chain of config merges.

That is, instead of just writing an object as is, we can create a bunch of functions that we chain together with compose and then call the resultant function to get our fully reified config.  Object creation is realtively cheap compared to rendering, and if we're calling the config creator often enough to bottleneck, we're also probably absolutely destroying any render performance, which is going to be more of a bottleneck than our config creator.

What we gain, then:
- We automatically have Config Creator Functions.  This is important in certain edge cases when dealing with semi-static configuration, as Highcharts mutates the object you pass into it.
- More importantly, we can document each config portion separately, explaining what each thing is for and why any weird parts might be in there.
  - This alone makes the pattern more than worth it.

What are some caveats, besides performance?
- Config is spread across multiple functions.
  - Spreading things across multiple sites always makes conflicts harder to spot.
  - However, I think the gain in documentation is much greater than any potential confusion that arises from this.



## Implementation Thoughts

How might this be done, then?


### Simple Composition

My first thought is just straight function composition: It takes a base config, uses something like `lodash.merge` to return a new one.

```js
import merge from 'lodash/merge'
import compose from 'lodash/fp/compose'

// Have a default empty config so we can call it
// without having to specify an empty object at the call site.
function addSomeFeature(config = {}) {
  return merge(config, {
    // ... stuff.
  })
}

// etc...

const specificConfig = compose(
  addSpecialThing,
  addSomeOtherFeature,
  addSomeFeature,
)
```

We could even add configuration:

```js
function configurableConfigFeature(options = {}) {
  return function $configFeature(config = {}) {
    return merge(config, {
      // ... stuff based on options.
    })
  }
}

// ...

const specificConfig = compose(
  configurableConfigFeature({ /* ... */ }),
  addSpecialThing,
  addSomeOtherFeature,
  addSomeFeature,
)
```

And of course, we can make that configurable at the call site:

```js
const specificConfigWithOptions = (options) => compose(
  configurableConfigFeature({ /* ... */ }),
  addSpecialThing,
  addSomeOtherFeature,
  addSomeFeature,
)()
// Make sure to call it within the function that takes options.
```


### More Complication for Negative Gain

A more complicated way would be to use the middleware methodology, since then every function could take two arguments: options and config.  While cute, this also presents an issue: Every function must take the same config object.  This is not the most usable.

```js
function configurableConfigFeature(next) {
  return function $configurableConfigFeature(options, config = {}) {
    return next(options, merge(config, {
      // ... stuff based on options.
    }))
  }
}

// ...

const specificConfig = compose(
  configurableConfigFeature,
  otherConfigurableFeature,
  anotherFeatureStill,
)((_, config = {}) => config)
```

That said, it might offer a slight performance advantage: Rather than invoking Lodash Compose's machinery every time it's called, it calls just the pre-bound inner functions.  However, again, I think that any performance benefits are outweighed by unnecessary obnoxiousness in the API: Everything is double wrapped regardless of configurability or non-configurability, and the composition requires the identity function at the end.

This also doesn't really help with configurability: Every single config-transform must adhere to the same options shape, which doesn't make sense.  Too much risk of conflict, not flexible enough.  It adds unnecessary coupling everywhere.

As shown, for simple value-creation, this pattern is too much.

#### The (Slightly) Better Version

At the cost of yet another layer, we can remove the dependency on the common options object:

```js
function configurableConfigFeature(options = {}) {
  return $configurableConfigFeature(next) {
    return $$configurableConfigFeature(config = {}) {
      return next(merge(config, {
        // ... stuff from options.
      }))
    }
  }
}
```

This is normally how the middleware pattern would be implemented.  However, it's still an extra layer for no gain.
