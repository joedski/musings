Using Functional Reactive Streams in Vue
========================================

Vue is already basically Reanctular + MobX, so this is kind of a silly idea.  OR IS IT?

- Computed properties are great, but basically only represent one Reactive operation: `Pipe(Combine, Map)`
- Watch is the lowest level, but lacks the real value of `Map`, which is getting a concrete Stream rep for its end result.
  - While you could claim that Watch also encopasses Side Effects, so does `Map` in our impure land, so they're more or less equivalent here.
- The biggest deficit present: The lack of a nice way to do `Pipe(Combine, Scan)`, which would give us the ability to do everything else.

So, on the one hand, you could just make a `scanned` props thing, and that would cover anything `computed` doesn't, albeit at increased cost.  But hey, it's decreased relative to lacking that abstraction.

On the other hand, we could just opt out of Vue's reactivity system for the data processing and come back for the rendering.  It's a bit silly, like Cycle.js but lame.

But I'm still gonna do it.

Why?  I ran into a case where the imperative linkage, if you can call anything imperative "linkage", resulted in spaghetti pseudo code before I even tried to implement it: I need to manage a selection of elements where the selected elements are a subset of a whole-collection that is only fetched by page from the server, and that selected subset can be updated either by synchronous user input or by fetches from the server triggered by various other update events that the component receives.  When I then broke things down in a more reactive streams manner, everything was easier to understand, and explicitly named.  I mean, in that case, I didn't want to include another library just to handle that one case, so I translated back to imperative code, but still.

> NOTE: If you just want to use streams for all of your data passage, you probably don't need to bother with what I'm doing; this was more to put a handy streams interface in a component that otherwise acts like a normal Vue component.  That said, since it exposes the defined sinks, you could just pass them down to child components...



## Initial Implementation Thoughts

From Vue's point of vue, the stream stuff will be a black box.  From the streams' point of view, events are coming from the void and its streams are updating accordingly and that's about it.  The render cycle then acts as the cycle break.


### Initial Conditions

The reactivity stuff isn't fully installed until after `created`, I think.  `beforeCreate` initializes anything not depending on anything else, then `created` initializes anything interdependent.  At least, that's how I use it.  I do know this much, though: Props are the first thing available, and you can see them in `beforeCreate`, then Data is initialized, then Vue can finally set up Computed, and those are available in `created`.

Since reactivity is setup by `created`, we can execute immediate updates then.  While you certainly could update `data` props as part of the stream sideeffects, it's probably better to give them their own outputs, their own Data props, rather than update other ones.  The less twisting about, the better.  That said, it's not a hard and fast rule, of course.

So, the basic interface for anything streaming is Sources and Sinks.  Inside that, the outside shouldn't really care.  Outside that, the inside shouldn't really care.  So it should be.  From there, it's just creating other streams from those sources and outputting streams for the sinks.


### On To Implementation

How would we do this initially, then?  Without any abstractions?

> NOTE: I'll be using `flyd` because it has a `y` in the name.  You can sub in your favorite stream/rx lib.

```js
import flyd from 'flyd'

export default {
  props: {
    someProp: { type: String },
  },

  data() {
    return {
      derivedProp: 0,
    }
  },

  created() {
    this.somePropSource$ = flyd.stream()
    this.$watch('someProp', {
      // NOTE: Since this is being created within the `created` hook,
      // we can safely use an arrow function for the handler.
      handler: next => someProp$(next),
      immediate: true,
    })

    this.derivedPropValue$ = flyd.map(
      someProp => someProp.length,
      this.somePropSource$
    )

    this.derivedPropSink$ = flyd.map(
      derivedProp => { this.derivedProp = derivedProp },
      this.derivedPropValue$
    )
  },

  beforeDestroy() {
    this.somePropSource$.end()
  }
}
```

A little more verbose than necessary, but eh.  You get the idea.  We have two interface points, which are naturally the Sources and Sinks.  The Vue reactivity system passes relevant events in through the Sources, and receives values or side effects through the Sinks.  As noted above, it doesn't give a flip about anything in the middle.

Some notes:
- The Sources interface is implemented using `vm.$watch`, which is the main way anything outside of Vue's Reactivity System can react to Vue Reactive Changes: having such changes explicitly applied via `vm.$watch` handlers.
- The Sinks interface is implemented via a stream performing side effects, namely the assignment to a Data Prop, although there's no reason we couldn't do some other side effect like call a method.

In truth, if we have access to the VM Instance, there's no real reason to actually do anything special with Sinks.  We just create a bunch of `Map` calls and that's that.  Given this is Vue, and Vue favors a bit of pragmatism and custom over belabored restriction, making whatever creates the Streams a plain function with access to the VM Instance via `this` seems fine.

```js
import flyd from 'flyd'
import StreamsMixin from '@/mixins/StreamsMixin'

export default {
  mixins: [StreamsMixin],

  props: {
    someProp: { type: String },
  },

  streams(source) {
    const somePropSource$ = source('someProp')
    const derivedPropValue$ = flyd.map(
      someProp => someProp.length,
      somePropSource$
    )
    return {
      derivedProp: derivedPropValue$,
    }
  },
}
```

How would fetches look in this regard, though?  I'm going to use the exposue of Axios as a service on VMs as `this.$axios` to show an example of accessing the VM instance:

```js
import flyd from 'flyd'
import StreamsMixin from '@/mixins/StreamsMixin'

export default {
  mixins: [StreamsMixin],

  props: {
    someProp: { type: String },
  },

  streams(source) {
    const somePropSource$ = source('someProp')
    // TODO: ... how?  Probably this.$sterams.source('buttonClicks')($event)
    const buttonClicks$ = source('buttonClicks')
    const derivedPropValue$ = flyd.map(
      someProp => someProp.length,
      somePropSource$
    )
    const fetches$ = flyd.combine(
      (someProp, buttonClicks, self, changed) => {
        if (changed.includes(buttonClicks)) {
          return this.$axios.get(`/api/get-thingy?someProp=${someProp}`)
        }
        // Since we return undefined, no update happens!
      },
      [someProp$, buttonClicks$]
    )
    .pipe(flyd.fromPromise)
    .pipe(flyd.map(res => res.data))
    return {
      derivedProp: derivedPropValue$,
      thingies: fetches$
    }
  },
}
```

We could also do something like treat the requests themselves as values while handling the fetches ourselves...

```js
import flyd from 'flyd'
import StreamsMixin from '@/mixins/StreamsMixin'

export default {
  mixins: [StreamsMixin],

  props: {
    someProp: { type: String },
  },

  streams(source) {
    const somePropSource$ = source('someProp')
    // TODO: ... how?  Probably this.$sterams.source('buttonClicks')($event)
    const buttonClicks$ = source('buttonClicks')
    const derivedPropValue$ = flyd.map(
      someProp => someProp.length,
      somePropSource$
    )
    const thingiesRequests$ = flyd.combine(
      (someProp, buttonClicks, self, changed) => {
        if (changed.includes(buttonClicks)) {
          return {
            method: 'GET',
            url: `/api/get-thingy?someProp=${someProp}`,
          }
        }
        // Since we return undefined, no update happens!
      },
      [someProp$, buttonClicks$]
    )
    const thingies$ = thingiesRequests$
    .pipe(flyd.map(this.$axios))
    .pipe(flyd.fromPromise)
    .pipe(flyd.map(res => res.data))
    return {
      derivedProp: derivedPropValue$,
      // Not necessary, but lets us see in the dev tools what's being passed.
      thingiesRequests: thingiesRequests$,
      thingies: thingies$,
    }
  },
}
```

What if we have other machinery in place to already handle requests or whatnot?  Answer: It only makes it easier:

```js
import flyd from 'flyd'
import StreamsMixin from '@/mixins/StreamsMixin'
import AsyncDataMixin from '@/mixins/AsyncDataMixin'

export default {
  mixins: [StreamsMixin],

  props: {
    someProp: { type: String },
  },

  asyncData: {
    thingy(someProp) {
      return this.$axios.get(`/api/get-thingy?someProp=${someProp}`)
        .then(res => res.data)
    }
  },

  streams(source) {
    const somePropSource$ = source('someProp')
    // TODO: ... how?  Probably this.$sterams.source('buttonClicks')($event)
    const buttonClicks$ = source('buttonClicks')
    const derivedPropValue$ = flyd.map(
      someProp => someProp.length,
      somePropSource$
    )
    // In this case, instead of passing out thingies$ as a sink stream,
    // we're just treating this as a side-effects sink and letting
    // the AsyncDataMixin handle the actual request and data prop.
    const thingiesRequests$ = flyd.combine(
      (someProp, buttonClicks, self, changed) => {
        if (changed.includes(buttonClicks)) {
          return someProp
        }
        // Since we return undefined, no update happens!
      },
      [someProp$, buttonClicks$]
    )
    // If we wanted to do anything with thingy, we'd just use:
    // const thingy$ = source('thingy')
    return {
      derivedProp: derivedPropValue$,
      // I originally performed the side effect up in the flyd.combine call,
      // but it really works better down here, I think.
      // By using tap() we can execute the side effect but still see the
      // value in the stream.
      thingiesRequests: flyd.map(
        tap(request => this.$asyncData.get.thingy(request)),
        thingiesRequests$
      )
    }
  },
}
```

That actually looks pretty tidy, aside from the fact that I have no idea how to both initialize the streams with data and use the returned obect to create Data props.  I suppose what could be done is to just create the streams all with `undefined` as their initial value then update everything once reactivity begins.  That does mean however that any Sink Values will start out `undefined`, too, even if they're reactive props.  This is because the Source streams will start out without any events, no values, so the Sink streams won't have any events either, except for those which begin with initial values like a Scan.


### Implementing This Version

It wouldn't actually be too bad, I think.
- A `$streams` Manager is created and attached to the Instance in the `beforeCreate()` hook, as is the proper place for creating such managers.
- `this.$options.streams` gets called in the mixin's `data()` hook, registering any requested sources with the Manager, and returning a set of Data Props for the Vue Reactivity System to watch.
- In the `created` hook, the Manager calls `this.$watch` to actually map Vue Reactivity Updates to Stream Events.
    - It uses `immediate: true` which then updates all the stream values and ultimately the Data Props.

A very basic version might look like this:

```js
function StreamsManager(vm) {
    const config = vm.$options.streams
    return {
        sources: {},
        sinks: null,

        source(name) {
            if (! this.sources[name]) {
                throw new Error(`StreamsManager: ${name} is not a defined source`)
            }
            return this.sources[name]
        },

        createSource(name, watchBinding = name, watchHandler = next => this.sources[name](next)) {
            if (this.$sources[name]) return this.$sources[name]
            this.sources[name] = Object.assign(flyd.stream(), {
                $watch() {
                    // If the name doesn't exist as a prop, don't watch it.
                    // TODO: Support path names?
                    if (typeof watchBinding === 'string' && ! (watchBinding in vm)) {
                        return
                    }
                    // Allow simple opt-out of automatic behavior.
                    if (typeof watchBinding === 'boolean' && ! watchBinding) {
                        return
                    }
                    vm.$watch(
                        // NOTE: When the watchBinding is a function, it's called
                        // with the vm as the context.
                        watchBinding,
                        watchHandler,
                        { immediate: true }
                    )
                }
            })
            this.sources[name]
        },

        data() {
            this.sinks = config
                ? config.call(vm, (name, watchBinding) => this.createSource(name, watchBinding))
                : {}

            return Object.keys(this.sinks).reduce(
                // Initialize to undefined, but the prop is defined on the object,
                // so there's that.
                (acc, key) => (acc[key] = undefined, acc),
                {}
            )

            this.data = () => {
                throw new Error('StreamsManager: Do not call StreamsManager#data() more than once')
            }
        },

        watch() {
            Object.keys(this.sources).forEach(key => this.sources[key].$watch())
            Object.keys(this.sinks).forEach(key => {
                this.sinks[key].pipe(flyd.map(v => {
                    vm[key] = v
                }))
            })
        }
    }
}
```

Then with the Mixin, we have:

```js
export default {
    beforeCreate() {
        this.$streams = StreamsManager(this)
    },

    data() {
        return this.$streams.data()
    },

    created() {
        this.$streams.watch()
    }
}
```

It's really pretty short.


### Concessions

The interface isn't the most flexible, and the events interface is a little annoying because you have to explicitly pass the event to the input stream.  Maybe if I changed it so that all the manager's methods were `$`-prefixed and stuck the source streams directly on it, that might make it more Vueish.

You also can't directly return sub-path objects, though I'm not exactly sure when that'd be useful given the sinks themselves are statically defined.  At that point, you'd be better off just combining any such streams and mapping them into the required deep object or list or whatever.


### Whack Number 2: Now With Fewer Parens

Because saving keystrokes is that important. (it's really not)

For the most part, it's exactly the same, it's just that the `StreamsManager`'s interface changes a bit.  Also changed the watch handler to accept the target stream as an argument and have it return the real handler so that you didn't have to reference the stream on `this`.  The handler is mostly for cases where you want both `next` and `prev`, though honestly I'd probably use Scan for that instead.  Lastly, added some cleanup in the `beforeDestroy` hook.

```js
function StreamsManager(vm) {
    const config = vm.$options.streams
    return {
        $sources: {},
        $sinks: null,

        $createSource(
            name,
            watchBinding = name,
            watchHandler = stream => next => stream(next)
        ) {
            this[name] = this.$sources[name] = Object.assign(flyd.stream(), {
                $watch() {
                    // If the name doesn't exist as a prop, don't watch it.
                    // TODO: Support path names?
                    if (typeof watchBinding === 'string' && ! (watchBinding in vm)) {
                        return
                    }
                    // Allow simple opt-out of automatic behavior.
                    if (typeof watchBinding === 'boolean' && ! watchBinding) {
                        return
                    }
                    vm.$watch(
                        // NOTE: When the watchBinding is a function, it's called
                        // with the vm as the context.
                        watchBinding,
                        watchHandler(this.$sources[name]),
                        { immediate: true }
                    )
                }
            })
            return this.$sources[name]
        },

        $data() {
            this.$sinks = config
                ? config.call(vm, (name, watchBinding) => this.$createSource(name, watchBinding))
                : {}

            return Object.keys(this.$sinks).reduce(
                // Initialize to undefined, but the prop is defined on the object,
                // so there's that.
                (acc, key) => (acc[key] = undefined, acc),
                {}
            )
        },

        $watch() {
            Object.keys(this.$sources).forEach(key => this.$sources[key].$watch())
            Object.keys(this.$sinks).forEach(key => {
                this.$sinks[key].pipe(flyd.map(v => {
                    vm[key] = v
                }))
            })
        },

        $end() {
            Object.keys(this.$sources).forEach(key => this.$sources[key].end(true))
        }
    }
}

export default {
    beforeCreate() {
        this.$streams = StreamsManager(this)
    },

    data() {
        return this.$streams.$data()
    },

    created() {
        this.$streams.$watch()
    },

    beforeDestroy() {
        this.$streams.$end()
    },
}
```

This works quite well.  A little redundant, but hey.  We could make it cleaner by sticking the methods on a prototype, but otherwise, there we go.

Some limitations:
- Since the streams themselves are exposed via `$streams[name]`, you can really only pass one event payload value to them.
    - Not much of a problem, though, because apparently you can specify a handler function inline, [so you can do this](https://jsfiddle.net/7jxL0fyu/):
        - `<foo @some-event="(foo, bar) => $streams.thingy([foo, bar])" />`
- Streams aren't pervasive: Instead of streams being the primary data management system ala Cycle.js, they're shoved into a box, albeit a box that handles all the component's event and state processing.
    - However, you can at least pass the sinks out via `this.$streams.$sinks`.
    - I suppose this could be circumvented by just having `stream.$watch` check if the target value is another stream and just subscribe to its values.  Flyd does have an `isStream()` utility.
    - Updates then still only come out via the Sinks, which is fine.

Could fix that streams-props one pretty easily:

```js
{
    $createSource(
        name,
        watchBinding = name,
        watchHandler = stream => next => stream(next)
    ) {
        // If it's a stream, then subscribe to it directly, bypassing vue.
        // We can check this because $createSource is called in $data, which is itself
        // called in the data hook on the component, and props are available there.
        if (typeof watchBinding === 'string' && flyd.isStream(vm[watchBinding])) {
            this[name] = this.$sources[name] = Object.assign(flyd.map(
                next => next,
                vm[watchBinding]
            ), {
                // Noop to preserve interface.
                $watch() {},
            })
        }
        else {
            this[name] = this.$sources[name] = Object.assign(flyd.stream(), {
                $watch() {
                    // If the name doesn't exist as a prop, don't watch it.
                    // This means you can create pure sources without an associated prop,
                    // which is useful for passing in events.
                    // TODO: Support path names?
                    if (typeof watchBinding === 'string' && ! (watchBinding in vm)) {
                        return
                    }
                    // Allow simple opt-out of automatic behavior.
                    // Useful if you want a source to have the same name as a prop,
                    // but don't want it to use $watch.  For some reason.
                    if (typeof watchBinding === 'boolean' && ! watchBinding) {
                        return
                    }
                    vm.$watch(
                        // NOTE: When the watchBinding is a function, it's called
                        // with the vm as the context.
                        watchBinding,
                        watchHandler(this.$sources[name]),
                        { immediate: true }
                    )
                },
            })
        }
        return this.$sources[name]
    },
}
```

A simple counter then looks like this:

```html
<template>
    <div class="counter">
        <div class="counter-count">{{ currentCount }}</div>
        <div class="counter-controls">
            <button @click="handleIncrementClick">
                Increment
            </button>
        </div>
    </div>
</template>
```

```js
export default {
    name: 'Counter',

    streams(source) {
        const counterClicks = source('counterClicks')
        const currentCount = counterClicks.pipe(flyd.scan(
            (acc) => acc + 1,
            0
        ))

        return {
            currentCount,
        }
    },

    methods: {
        handleIncrementClick(event) {
            this.$streams.counterClicks(event)
        }
    },
}
```

Here's what the original Vue code might look like:

```js
export default {
    name: 'Counter',

    data() {
        return {
            currentCount: 0,
        }
    },

    methods: {
        handleIncrementClick(event) {
            this.currentCount += 1
        },
    },
}
```

The Ideomatic Vue version is more concise... for now.  FRP wins out in the long run, though.


### Object Paths

There's a pretty big limitation in the above: It fails when you hand `$createSource` an object path.  We really need something like `lodash.has`.  Given that, I'm leaning towards not having any automatic behavior at all.  That is, if you want to bind to a Prop, you have to explicitly specify a watcher on that prop.

```js
export default {
    props: {
        foo: { type: String },
    },

    streams(source) {
        // Must pass in the watch listener in the second arg.
        const foo = source('foo', 'foo')
        return {
            FOO: foo.map(a => String(a).toUpperCase()),
        }
    },
}
```


### Starting with Values

Just use `source('thinger').pipe(flyd.merge(startsWith(someValue)))` or whatever.  Would be nice to have some shorthand for that, but `source()` is overloaded as is.  Alternatively, you could do `const foo = source('foo'); foo(initValue);`.  The only problem there is that any scans will then be off-by-one by the time the initial render occurs.  Bleh!


### Stream Props

I decided to drop special treatment of Props that are Streams.  You can easily and more robustly cover that case with [a `mergeAll` type thing](https://github.com/bertofer/flyd-mergeAll).  Or even just `flyd.combine((...ss, self, changed) => (flyd.isStream(ss()) ? ss()() : undefined), [streamOfPropWatch])`.



## Too Fancy?

What about if I just made it so that you create sources like normal, then hook them up explicitly via `this.$watch` or something?  And then you'd return an object with `{ sources: { ... }, sinks: { ... } }`?  Hm.

```js
export default {
    streams() {
        const someProp = flyd.stream()
        this.$watch('someProp', next => someProp(next))
        const clicks = flyd.stream()
        const somePropChanges = someProp.pipe(flyd.scan(
            (acc) => acc + 1,
            0
        ))
        const clickCount = clicks.pipe(flyd.scan(
            (acc) => acc + 1,
            0
        ))

        return {
            $sources: {
                someProp,
                clicks,
            },
            $sinks: {
                somePropChanges,
                clickCount,
            },
        }
    },
}
```

Hm.  Returning `$sources` and `$sinks` makes it very obvious what's happening.  It provides a very nice symmetry to `this.$streams.$sources` and `this.$streams.$sinks`.

We could easily wrap that in a helper:

```js
export default {
    streams() {
        const someProp = this.$streams.$fromWatch('someProp')

        return {
            $sources: {
                someProp,
            },
            $sinks: {
                // ...
            }
        }
    }
}
```

That's basically the `source()` function from my first version, but without the `name` parameter.

On the one hand, I like the simplicity.  On the other hand, it is another layer up.  Dunno.  Currently leaning towards the first interface rather than this one.  Another thing going for the first interface is that the timing of when `$watch` is actually called is handled for you.  Here you have the special function `$fromWatch` which feels like extra.  I guess you could also do `$fromProp` as a simplified version, but eh.

Given that we'll probably be using `$fromWatch` for a lot of sources, we'll probably want to pass that in.

```js
export default {
    streams({ $fromWatch }) {
        const someProp = $fromWatch('someProp')

        return {
            $sources: { someProp },
            $sinks: { /* ... */ },
        }
    }
}
```


### Do We Actually Need Watch Handler?

Another thought I just had is this: We might not really need the watch handler.  The only time I can think of that it's useful is if you do `stream => (next, prev) => stream([next, prev])`, and honestly, you can do that with `flyd.scan((acc, next) => [next, acc[0]], [])`, so you don't really gain much by being able to change that.  Seems like something in both API shapes I've checked out that honestly doesn't need to be there.  It pollutes the API without adding anything.



## Typescript Friendly

This initial interface, although a bit wonky implementation wise, is actually pretty nice to use.  I like it.  It's not the most friendly to static systems like Typescript, though, being that Sources are created imperatively rather than declaratively.  (I suppose there's some argument about whether or not the `streams()` option is indeed imperative or declarative, but anyway.)

Now, I don't actually care about how the Sources themselves are created, only that it's not easy to statically type the current interface in Typescript.  In fact, since it's based completely on actually executing JS, it's impossible in the current system.  Hm.

Hmmm.

Hmmmmmmmm.

The issue is that we need to have Sources their own thing, so that `this.$streams.$sources` or however they'll be accessed can have a specified interface.  As noted, I don't actually care about how they're created, so long as we have the interface.  So, maybe we just shove Source creation into its own function?  This would give us a few things:
- The inferred interface of the return value of this Sources Definition Function would be, well, the interface for our Sources.
- The creation of Sources is in its own explicitly defined area, which is good for documentation.
    - It's not an Object, but it at least returns one.
- It's symmetrical with how the Sinks are created.
    - Granted, this isn't necessarily important, but it is comfy.

So, we get something like this:

```js
export default {
    mixins: [StreamsMixin],

    streams: {
        sources({ fromWatch }) {
            const prop = fromWatch('prop')
            const combined = fromWatch(() => (this.a + this.b))
            const clicks = flyd.stream()

            return { prop, combined, clicks }
        },
        sinks(sources) {
            const clickCount = clicks.pipe(flyd.scan(acc => acc + 1, 0))
            const moreCombined = flyd.combine(
                (prop, combined, self, changed) => {
                    return `${prop()} - ${combined()}`
                },
                [sources.prop, sources.combined]
            )

            return { clickCount, moreCombined, combined: sources.combined }
        }
    }
}
```

Bad points:
- More nesting.
- Sources are not independently defined, they're created imperatively, effectively.
- function instead of an object means execution of JS is required for tooling to do anything with it.

Good points:
- Still have an explicit type for Sources.
- Creation of Sources is symmetrical with Creation of Sinks.

Wash Points:
- Sinks is already a function, and trying to break _that_ out into something more strictly declarative would require a compiler that's even more complex to write and test, or a whole mess of utility functions to make it not unbearable to write.
- We don't actually care about what happens inside the Sources Definition Function, only the output it returns.

Uncertainties
- Not sure about the exact interface of the manager, but it probably won't change that much?
- And I'm still thinking of controlling the current values of some `data` props with the Sinks.  That's just handy.
- Referincing a sink as a source is not forbidden, but is a bad idea.  Maybe it should be warned?  Hm.

Never the less, this seems like an improvement to me: `source`'s weirdness is gone, `fromWatch` is more meaningful, and knowing about `sources` and `sinks` is enforced.  Plus, `sinks` ends up looking a bit closer to Cycle, which is probably a good thing.


### Implementation: API 2.0

Or v0.3.0, I guess.  Still in the v0.x versions, after all.

```js
function StreamsManager(vm) {
    const config = vm.$options.streams
    const hasConfig = config && config === 'object'
    if (hasConfig && ! (
        typeof config.sources === 'function'
        && typeof config.sinks === 'function'
    )) {
        throw new Error(`StreamsManager cannot be created for ${vm.$options.name || '(Anonymous Component)'}: vm.$options.streams.sources and vm.$options.streams.sinks must both be functions`)
    }

    const manager = {
        $sources: {},
        $sinks: {},
        $controller: null,
    }

    manager.$controller = StreamsController(vm, config, manager)

    return manager
}

function StreamsController(vm, config, manager) {
    const hasConfig = config && config === 'object'

    return {
        initializeStreams() {
            if (!hasConfig) return

            const sources = config.sources.call(vm, {
                fromWatch: (watchBinding, watchOptions) => this.streamFromWatch(watchBinding, watchOptions),
            })

            const sinks = config.sinks.call(vm, sources)

            Object.assign(manager.$sources, sources)
            Object.assign(manager, sources)
            Object.assign(manager.$sinks, sinks)
        },

        streamFromWatch(watchBinding, watchOptions) {
            const stream = flyd.stream()
            vm.$watch(
                watchBinding,
                next => stream(next),
                { immediate: true, ...watchOptions }
            )
            return stream
        },

        data() {
            return Object.entries(manager.$sinks).reduce(
                (acc, [key, stream]) => {
                    acc[key] = stream()
                    return acc
                },
                {}
            )
        },

        watch() {
            Object.entries(manager.$sinks).forEach(([key, stream]) => {
                stream.pipe(flyd.on(e => { vm[key] = e }))
            })
        },

        end() {
            Object.values(manager.$sources).forEach((stream) => {
                stream.end(true)
            })
        },
    }
}
```

I moved the Controller stuff to a separate part for a bit cleaner separation.  The Mixin is then basically the same, though:

```js
export default {
    beforeCreate() {
        this.$streams = StreamsManager(this)
        this.$streams.$controller.initializeStreams()
    },

    data() {
        return this.$streams.$controller.data()
    },

    created() {
        this.$streams.$controller.watch()
    },

    beforeDestroy() {
        this.$streams.$controller.end()
    },
}
```

The only tough part, then, is `streamFromWatch`.  Can any Typescript stuff actually apply typing to watches?  That might require some type anotations that can't actually be proven at compile time.  Hm.  You might have to just use only Function for Watch Bindings for that, that's the only thing I can think of.  Which is fine.  `fromWatch(() => this.foo)` is only a little longer than `fromWatch('foo')`.


### Type Musing

For `streamsFromWatch`, I suspect something like this:

```
interface IStreamsController<TComponent, TConfig> {
    <TWatch>streamsFromWatch(
        watchBinding: (this: TComponent) => TWatch,
        watchOptions: Partial<{ immediate: boolean, deep: boolean }> | void,
    ) => Stream<TWatch>;
    streamsFromWatch(
        watchBinding: string,
        watchOptions: Partial<{ immediate: boolean, deep: boolean }> | void,
    ) => Stream<any>;
}
```

Not quite sure that'll work for everything, buuut it's a start.
