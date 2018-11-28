More Complex Computed Values: Scans
===================================

In my ponderings about what might make Vue better (more like reactive stream things), I remembered that two of the most basic operations in reactive stream thingers are Combine and Scan (Reduce).  I think for the most part in Vue, you'd want both since it's not really use without them.



## Bikeshedding on the Configuration

Once the configuration shape is settled upon, the implementation is really easy: Watchers and Functions.

```js
export default {
  name: 'ComponentWithScannedProps',

  props: {
    incrementAmount: { type: Number, default: 1 },
  },

  data() {
    return {
      clickEvent: null,
    }
  },

  scanned: {
    count: {
      // array elems can be anything that vm.$watch accepts as a target.
      watch: ['clickEvent', 'incrementAmount'],
      initial() {
        return 0
      },
      scan(acc, [[nextClickEvent, prevClickEvent], [incrementAmount]]) {
        if (nextClickEvent && nextClickEvent !== prevClickEvent) {
          return acc + incrementAmount
        }
        return acc
      }
    }
  },
}
```

Is there a more compact and idiomatic way to do this?  How about if I at least spread those 2-tuples, and put the initial-value for `acc` as a default value?

```js
export default {
  name: 'ComponentWithScannedProps',

  props: {
    incrementAmount: { type: Number, default: 1 },
  },

  data() {
    return {
      clickEvent: null,
    }
  },

  scanned: {
    count: {
      // array elems can be anything that vm.$watch accepts as a target.
      watch: ['clickEvent', 'incrementAmount'],
      scan(
        acc = 0,
        [nextClickEvent, prevClickEvent],
        [incrementAmount]
      ) {
        if (nextClickEvent && nextClickEvent !== prevClickEvent) {
          return acc + incrementAmount
        }
        return acc
      }
    }
  },
}
```

Obviously this still suffers from the other issue about Vue/Mobx: Computed Props (Maps) will be separated from the Scanned Props, but oh well.

Of course, the above really acts like Combine more than Scan.  To do a Scan, we really need to convert each change into some known shape that the Scanner itself can operate on.

```js
export default {
  name: 'ComponentWithScannedProps',

  props: {
    incrementAmount: { type: Number, default: 1 },
  },

  data() {
    return {
      clickEvent: null,
    }
  },

  scanned: {
    count: {
      watch: [
        ['clickEvent', (next) => ['click', next]],
        ['incrementAmount', (next) => ['increment', next]],
      ],
      scan(
        acc = 0,
        next
      ) {
        if (next[0] != 'click') return acc
        return acc + next[1]
      }
    },
  },
}
```

Obviously, this example doesn't even need to watch `incrementAmount` because it doesn't actually update the value when `incrementAmount` changes, so the `scan` function there can just reference `this.incrementAmount` directly.

That makes it much easier, honestly.  And, also, you really only need to use this for more complex props, anyway.  Anything that's a simple Pipe(Combine, Map) operation can be done with Computed Props as normal.

I suppose if we wanted to be the absolute laziest, we could do this:

```js
export default {
  name: 'ComponentWithScannedProps',

  props: {
    incrementAmount: { type: Number, default: 1 },
  },

  data() {
    return {
      clickEvent: null,
    }
  },

  scanned: {
    count: {
      watch: [
        'clickEvent',
        // implies ['clickEvent', (next, prev) => ['clickEvent', next, prev]]
        'incrementAmount',
        // implies ['clickEvent', (next, prev) => ['incrementAmount', next, prev]]
      ],
      scan(
        acc = 0,
        next
      ) {
        if (next[0] != 'click') return acc
        return acc + this.incrementAmount
      }
    },
  },
}
```

And if we really needed custom watch functions (which I haven't really used until now, though I've known they exist), we could do this:

```js
export default {
  name: 'ComponentWithScannedProps',

  props: {
    incrementAmount: { type: Number, default: 1 },
  },

  data() {
    return {
      clickEvent: null,
    }
  },

  scanned: {
    count: {
      watch: [
        function clickEvent() {
          return this.clickEvent
        },
        // implies [function clickEvent() {...}, (next, prev) => ['clickEvent', next, prev]]
        function incrementAmount() {
          return this.incrementAmount
        },
        // implies [function clickEvent() {...}, (next, prev) => ['incrementAmount', next, prev]]
      ],
      scan(
        acc = 0,
        next
      ) {
        if (next[0] != 'click') return acc
        return acc + this.incrementAmount
      }
    },
  },
}
```

It works of course because those have to be normal functions in order to access the VM Instance, and it's good practice to give normal functions names.

And with destructuring, you can make this friendly, of course.

```js
export default {
  name: 'ComponentWithScannedProps',

  props: {
    incrementAmount: { type: Number, default: 1 },
  },

  data() {
    return {
      clickEvent: null,
    }
  },

  scanned: {
    count: {
      watch: [
        'clickEvent',
        'incrementAmount',
      ],
      scan(acc = 0, [watchName, next, prev]) {
        if (watchName != 'clickEvent') return acc
        return acc + this.incrementAmount
      }
    },
  },
}
```

The only bad thing is that you can't shoot events straight in without taking a detour through a Data Prop.  Hmmmmm.  That's quite annoying.  As well, while using the Default Parameter Value feature is nice, it means that initial value isn't really available outside the Scanner function, and really saves only one line at best.

The latter can at least be solved by putting `initial()` back.

```js
export default {
  name: 'ComponentWithScannedProps',

  props: {
    incrementAmount: { type: Number, default: 1 },
  },

  data() {
    return {
      clickEvent: null,
    }
  },

  scanned: {
    count: {
      watch: [
        'clickEvent',
        'incrementAmount',
      ],
      initial() { return 0 },
      scan(acc, [watchName, next, prev]) {
        if (watchName != 'clickEvent') return acc
        return acc + this.incrementAmount
      }
    },
  },
}
```

The former I'm not sure about.

Well, since I have the name as the first thing, why not just reuse that?  Maybe like...

- `@click="this.$scanned.count.clickEvent($event)"`?
- `@click="this.$scanned.count('clickEvent', $event)"`?

Hm.  I suppose if a name can't be derived (via string (path strings are fine) or `Function#name`) then a simple numeric index is also allowed, but a warning is issued during development mode.
