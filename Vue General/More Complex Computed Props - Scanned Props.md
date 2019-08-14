More Complex Computed Values: Scans
===================================

In my ponderings about what might make Vue better (more like reactive stream things), I remembered that two of the most basic operations in reactive stream thingers are Combine and Scan (Reduce).  I think for the most part in Vue, you'd want both since it's not really use without them.



## The Simplest Approach: Computed Prop + Data Prop

- To be Reactive, a Computed Prop must be backed by a Data Prop.
- Computed Props can define both getters and setters.

This is the basic-most approach to scanned props, but suffers the defect of separating the state of the scanned prop from the computation thereof.

```js
export default {
  props: {
    incrementAmount: { type: Number, default: 1 },
  },

  data() {
    return {
      // Initial state.
      // Note prefix.
      _count: 0,
    }
  },

  computed: {
    count: {
      get() {
        return this._count;
      },
      // next is ['incr', amount] | ['decr', amount] | ['reset']
      set(next) {
        this._count += this.incrementAmount;
      }
    },
  },
}
```

A more complex setup is basically the same:

```js
export default {
  props: {
    incrementAmount: { type: Number, default: 1 },
  },

  data() {
    return {
      // Initial state.
      // Note prefix.
      _count: 0,
    }
  },

  computed: {
    count: {
      get() {
        return this._count;
      },
      // next is ['incr', amount] | ['decr', amount] | ['reset']
      set(next) {
        switch (next[0]) {
          case 'incr':
            this._count += next[1];
            break;

          case 'decr':
            this._count -= next[1];
            break;

          case 'reset':
            this._count = 0;
            break;
        }
      },
    },
  },
}
```

In that case, it's used like `this.count = ['incr', this.incrementAmount]`.



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


### Minimal Most: Reducer and Initial

I think the minimal-most setup would be in imitation of the minimal example up top:

```js
export default {
  props: {
    incrementAmount: { type: Number, default: 1 },
  },

  scanned: {
    count: {
      initial: () => 0,
      scan(acc, next) {
        // next is ['incr', amount] | ['decr', amount] | ['reset']
        switch (next[0]) {
          case 'incr': return acc + next[1];
          case 'decr': return acc - next[1];
          case 'reset': return 0;
          default: return acc;
        }
      },
    },
  },
}
```

Then you just do:

```html
<template>
  <div class="count">{{ this.count }}</div>
  <div class="controls">
    <button
      class="btn"
      @click="this.click = ['incr', this.incrementAmount]"
    >Incr</button>
    <button
      class="btn"
      @click="this.click = ['decr', this.incrementAmount]"
    >Decr</button>
    <button
      class="btn"
      @click="this.click = ['reset']"
    >Reset</button>
  </div>
</template>
```

> Aside: While I use the tuple-union actions style of value here, there's actually no reason you need to do that.  You can do anything, even just using numbers, strings, or going so far as objects, functions, etc.

This is probably the best interface because:

- It's simple, uncomplicated.
- It's self contained, no watches or anything like that.
- Because there're no watches, there're no magically appearing extra data/props.
- Behavior is thus easy to compose.
- Interface is entirely user-definable, unlike the above APIs.
- Arguably more Vue-like in that you interact with it in much the same way you interact with data/props/computed already.

And it is, in fact, exactly equivalent to the "Simplest Approach" at the top.

Only problem now is, I'm not sure how to define extra Computed Props at Lifecycle Hook time.

Implementation wise, the above interface is probably most easily done by using `Object.defineProperty` to create the get/set pairs on the instance in the `beforeCreate()` hook, and create a top level Data value with a key that is low-conflict, something like `_scannedDataState: {}`, and put the state values in there.  Then, at the very least, they're visible to Vue Dev Tools, even if it's not the best place.

#### TypeScript Friendly?

As noted in [all the discussion on this issue](https://github.com/Microsoft/TypeScript/issues/2521), as of 2019-03-18 it's unlikely that TypeScript is going to have any support for get/set pairs that have different types, which means the above will cause either a bunch of type errors or a bunch of noise.

In that case, we'll probably want some indirection, something like `this.$scanned.push('count', ['incr', this.incrementAmount])`, or else `this.$scanned.count = ['incr', this.incrementAmount]`, etc.  Something to separate the setter from the getter.



## Another Way: Convention Around Data and Watches and/or Events

A way to do this without invoking extra mixin tooling is to implement it with Watches and/or Events.

Suppose this:

```js
export default {
    props: {
        initialValue: { type: Number, default: 0 },
        incrementAmount: { type: Number, default: 1 },
        externalEvents: { type: Object, default: null },
    },

    data() {
        return {
            // Initial state.
            count: this.initialValue,
        };
    },
};
```

Then, we could respond to a change in some value using a Watch:

```js
export default {
    props: {
        incrementAmount: { type: Number, default: 1 },
        externalEvents: { type: Object, default: null },
    },

    data() {
        return {
            count: this.initialValue,
        };
    },

    watch: {
        externalEvents(next, prev) {
            // always check when using Objects as values.
            if (next === prev) return

            switch (next[0]) {
                case 'incr': this.count += 1; return;
                case 'decr': this.count -= 1; return;
                case 'reset': this.count = this.initialValue; return;
                default: return;
            }
        },
    },
};
```

Or use an Event:

```js
export default {
    props: {
        incrementAmount: { type: Number, default: 1 },
    },

    data() {
        return {
            count: this.initialValue,
        };
    },

    methods: {
        handleClick() {
            this.$emit('scan:count', ['incr']);
        }
    },

    created() {
        this.$on('scan:count', (action) => {
            switch (action[0]) {
                case 'incr': this.count += 1; return;
                case 'decr': this.count -= 1; return;
                case 'reset': this.count = this.initialValue; return;
                default: return;
            }
        });
    },
};
```

Combining both methodologies is trivial:

```js
export default {
    props: {
        incrementAmount: { type: Number, default: 1 },
        externalEvents: { type: Object, default: null },
    },

    data() {
        return {
            count: this.initialValue,
        };
    },

    watch: {
        externalEvents(next, prev) {
            // always check when using Objects as values.
            if (next === prev) return

            this.$emit('scan:count', next);
        },
    },

    methods: {
        handleClick() {
            this.$emit('scan:count', ['incr']);
        }
    },

    created() {
        this.$on('scan:count', (action) => {
            switch (action[0]) {
                case 'incr': this.count += 1; return;
                case 'decr': this.count -= 1; return;
                case 'reset': this.count = this.initialValue; return;
                default: return;
            }
        });
    },
};
```

Over all, this is probably the easiest to implement since you just add a bunch of things to setup in the `created` handler.  My biggest issue is that, TS-wise anyway, you don't gain any type safety except for the Dataprop itself.

The only issue of course it that it's more of an implementation modality than a formalization, but the fact that it's implementable like this means you can easily wrap it up, so maybe that's less a complaint and more of a whining about how lazy I am in this section.  Eh.
