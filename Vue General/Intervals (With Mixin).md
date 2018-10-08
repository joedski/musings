Intervals in Vue Components
===========================

The mark of a good abstraction is that it composes well with other abstractions.  This Intervals Mixin is one that in my experience has composed very well, especially with things like requests wrapped in [AsyncData](../General/AsyncData/Vue%20Interface.md).

The idea is simple: Define intervals in the component and receive an interface to start/stop them.  You can also add/remove them at "run time" if necessary, though that's more an escape hatch than anything.

In my first revision, I had an `auto` flag that triggered them automatically, but this complicates the interface since I want to create the intervals as early as possible.  Now I just omit that.  If you want to start them yourself, start them in a hook.  `mounted()` is usually pretty good.  Same for if you want one to start immediately after adding it: Just call it immediately after adding it.

```js
function createIntervalsManager(vm) {
  const mixinName = `IntervalsMixin(${vm.$options.name || '(AnonymousComponent)'})`

  const $intervals = {
    intervals: {},
    running: {},

    add(name, def) {
      if (
        !def ||
        !(
          (typeof def.handler === 'function' || typeof def.handler === 'string') &&
          typeof def.interval === 'number'
        )
      ) {
        throw new Error(`${mixinName}: Invalid interval definition for '${name}'`)
      }

      $intervals.intervals = {
        immediate: false,
        ...def,
      }
    },

    remove(name) {
      if (!$intervals.intervals[name]) {
        return
      }
      $intervals.stop(name)
      delete $intervals.intervals[name]
    },

    start(name) {
      if (!$intervals.intervals[name]) {
        throw new Error(`${mixinName}: Cannot start interval '${name}', interval not defined`)
      }

      if ($intervals.running[name] != null) {
        return
      }

      $intervals.running[name] = setInterval(
        () => $intervals._call(name),
        $intervals.intervals[name].interval
      )

      if ($intervals.intervals[name].immediate) {
        $intervals._call(name)
      }
    },

    stop(name) {
      if (name == null) {
        Object.keys($intervals.running).forEach(intervalName => {
          $intervals.stop(intervalName)
        })
        return
      }

      if ($intervals.running[name] != null) {
        clearInternal($intervals.running[name])
        delete $intervals.running[name]
      }
    },

    _call(name) {
      const fn = $intervals.intervals[name].handler
      if (typeof fn === 'string') {
        vm[fn]()
      }
      else {
        fn.call(vm)
      }
    }
  }

  if (vm.$options.intervals) {
    Object.keys(vm.$options.intervals).forEach(name => {
      $intervals.add(name)
    })
  }

  return $intervals
}

export default {
  beforeCreate() {
    this.$intervals = createIntervalsManager(this)

    if (this.$options.intervals) {
      Object.keys(this.$options.intervals).forEach()
    }
  },

  beforeDestroy() {
    this.$intervals.stop()
  },
}
```
