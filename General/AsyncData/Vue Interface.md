AsyncData - Vue Interface
=========================

Just some initial sketching.  May replace this with refinements later.

```js
this.foo // -> AsyncData.NotAsked
this.$asyncData.foo()
this.foo // -> AsyncData.Waiting

// manual reset:
this.foo = this.$asyncData.$notAsked()

// manual test:
this.$asyncData.$is(this.foo) // -> true
this.$asyncData.$waiting.$is(this.foo) // -> false
this.$asyncData.$notAsked.$is(this.foo) // -> true
```

Previously, I added extra methods prefixed with `get`, so an async data prop `foo` would create an attendant method `getFoo`, but that's not TypeScript friendly, and doesn't namespace things as much.  Putting the request initiators on `this.$asyncData.propName` seems like a nicer solution.

I'll probably still use Daggy under the hood.

Being lazy, I could just do this:

```js
export default {
  beforeCreate() {
    this.$asyncData = Object.create(AsyncData, {
      ...createAsyncDataGetters(this)
    })
  },
}
```

That gives us an interface like so:

```js
this.foo = this.$asyncData.NotAsked

this.$asyncData.is(this.foo) // -> true
this.$asyncData.NotAsked.is(this.foo) // -> true
this.$asyncData.foo()

this.$asyncData.Waiting.is(this.foo) // -> true
```

I think Daggy's use of non-functions for types of no arguments is annoying, but oh well.  I guess it does not obscure the fact that they're singletons.

Though, I don't like the remote possibilities of name conflicts and like somewhat readable names, so maybe...

```js
export default {
  beforeCreate() {
    this.$asyncData = Object.create(AsyncData, {
      get: createAsyncDataGetters(this),
    })
  }
}
```

Which yields

```js
this.$asyncData.get.foo()
```

Which is perhaps a bit more sensical.  I suppose we could also do `this.$asyncData.get('foo')` too, which is even typecheckable in TypeScript, but eh.  I think htat `get.foo()` is better when you start involving arguments.

This works quite well for namespace isolation: We don't worry about conflicts because props are siloed in their own dedicated subprop.

The code to implement this is surprisingly succinct.

```js
// AsyncData type created using daggy
import AsyncData from '@/utils/AsyncData'

function createGetter(propName, propConfig) {
  if (typeof propConfig === 'function') {
    return createGetter.call(this, propName, {
      get: propConfig
    })
  }

  if (
    typeof propConfig === 'object'
    && propConfig
    && typeof propConfig.get === 'function'
  ) {
    const propInitial = (
      typeof propConfig.propInitial === 'function'
        ? propConfig.propInitial
        : () => AsyncData.NotAsked
    )
    const propReduce = (
      typeof propConfig.reduce === 'function'
        ? propConfig.reduce
        : (prevPropValue, nextResolvedValue, args) => nextResolvedValue
    )
    const propGetter = (...args) => {
      this[propName] = propReduce.call(this[propName], AsyncData.Waiting, args)
      return propGetter.apply(this, args)
        .then(
          (result) => AsyncData.Result(result),
          (error) => AsyncData.Error(error)
        )
        .then((next) => {
          this[propName] = propReduce.call(this, this[propName], next, args)
          return next
        })
    }
    return Object.assign(propGetter: {
      $reduce: propReduce,
      $initial: propInitial,
    })
  }

  throw new Error(`AsyncDataMixin(${this.options.name || '(AnonymousComponent)'}): Cannot create getter for ${propName}: No valid config specified`)
}

// Mixin:
export default {
  beforeCreate() {
    const asyncDataPropConfigs = this.$options.asyncData

    this.$asyncData = Object.assign(Object.create(AsyncData), {
      get: asyncDataPropConfigs
        ? Object.keys(asyncDataPropConfigs).reduce(
          (acc, propName) => {
            acc[propName] = createGetter.call(this, propName, asyncDataPropConfigs[propName])
            return acc
          },
          {}
        )
        : {}
    })
  },

  data() {
    return Object.keys(this.$asyncData.get).reduce(
      (acc, propName) => {
        acc[propName] = this.$asyncData.get[propName].$initial.call(this)
      },
      {}
    )
  },
}
```


### Take 3: Prop Managers?

What if we did something like `this.$asyncData.foo.get()`?  This would also expose things like `this.$asyncData.foo.update(nextRes)` and `this.$asyncData.foo.reset()`.

This has a nice feel, it reads very naturally in Vue type settings.  It also explicitly encodes the mutations that occur, rather than exposing only computations and leaving the mutations to be manually done each time.

What I don't like is the fact that it exposes the ability to inject any value into the reduction.  I mean, granted, if you do that, anything that breaks is your own fault, and the user can always overwrite the dataprop anyway, since to my knowledge you can't dynamically define computed props.  On top of that, I already expose the machinery in the other version via `this.$asyncData.get.foo.$reduce(...)` and `foo.$initial()`; granted those don't automatically update the dataprops like `foo.update()` and `foo.reset()` would.

How would this version look implementation wise?  Like the last version, it's very succinct.

```js
function createProp(propName, propConfig) {
  if (typeof propConfig === 'function') {
    return createGetter.call(this, propName, {
      get: propConfig
    })
  }

  if (
    typeof propConfig === 'object'
    && propConfig
    && typeof propConfig.get === 'function'
  ) {
    const propInitial = (
      typeof propConfig.propInitial === 'function'
        ? propConfig.propInitial
        : () => AsyncData.NotAsked
    )
    const propReduce = (
      typeof propConfig.reduce === 'function'
        ? propConfig.reduce
        : (prevPropValue, nextResolvedValue, args) => nextResolvedValue
    )
    const propReset = () => {
      this[propName] = propInitial()
    }
    const propUpdate = (next, args) => {
      this[propName] = propReduce.call(this, this[propName], next, args)
    }
    return {
      get: (...args) => {
        propUpdate(AsyncData.Waiting, args)
        return propConfig.get.apply(this, args)
          .then(
            (result) => AsyncData.Result(result),
            (error) => AsyncData.Error(error)
          )
          .then((next) => {
            propUpdate(next, args)
            return next
          })
      },
      reset: propReset,
      update: propUpdate,
    }
  }

  throw new Error(`AsyncDataMixin(${this.options.name || '(AnonymousComponent)'}): Cannot create getter for ${propName}: No valid config specified`)
}

export default {
  beforeCreate() {
    const asyncDataPropConfigs = this.$options.asyncData || {}

    this.$asyncData = Object.assign(
      Object.create(AsyncData),
      Object.keys(asyncDataPropConfigs).reduce(
        (acc, propName) => {
          acc[propName] = createProp.call(this, propName, asyncDataPropConfigs[propName])
          return acc
        },
        {}
      )
    )
  },

  data() {
    const asyncDataPropConfigs = this.$options.asyncData || {}

    return Object.keys(asyncDataPropConfigs).reduce(
      (acc, propName) => {
        acc[propName] = this.$asyncData[propName].reset()
      },
      {}
    )
  },
}
```



## On `this.$asyncData` being the `AsyncData` Type Representative

This is mostly out of laziness and not wanting yet more names or property accesses.  `this.$asyncData.NotAsked.is()` is already a bit much.  That's really all there is to it.
