Reactivity and Streams
======================

Okay, nothing really profound here, more just slight opining.

After having used Redux, Mobx, and Vue, and played with FR stream libraries like most and flyde, I can see why proponents of those like them so much.

To start, Redux is possibly the easiest to understand the implications of, although Mobx and Vue are certainly friendlier to first time devs.  Redux is just (basically) a pile of functions, with no special handling for caching or anything like that, so the process of preventing unnecessarily recalculation is a manual one.  It's very low level.

Creation of derived data is very simple: It's just functions.  But, buliding in the caching layer to this for preventing unnecessary recalculation is more tedious.

Next in the things that I worked with, we have things like Vue and Mobx, which transform state props into getter/setter pairs and use an internal observer class to manage caching of derived data automatically for the user, as well as not performing unnecessary calculations.

However, despite this friendlier setup, quite a few time/order operations are still rather manual to do.  We get some caching for free, especially when breaking the processing of a computed prop across multiple computed props, but we still have no encoded notion of time and, while it's nice to imagine that our interface should be invariant in time, the fact of the matter is that temporal ordering is important.  Even Reduce has to be implemented using a watch.

Which brings me to FRP Streams, such as most, flyde, and RX, which include tools out of the box to operate over values over time rather than just values: Notions such as Take Latest and Reduce are included out of the box, things which would have to be built up out of one or more watches in Vue.  Reactive streams themselves are basically all computed props out of the box.

Now if only there were an idiomatic way to deal with nested props...

I guess if you went the Lodash route and shorthanded an iteratee of `string` to mean `prop(path)` you could do `$foo_bar = $foo.map('bar')`.



## Have Our Cake and Eat It Too?

My initial thought was that we could just use `$` as a prefix for any operators.  So, mapping the prop stream would be:

```
foo.$map(v => ({ ...v, bar: true }))
```

Then, for property access, you can just use standard dot notation:

```
foo.bar.baz
// sugar for
foo.$map(v => v.bar).$map(v => v.baz)
```

And so on.  The important thing to notice is that this "property" access on the original stream still results in another stream.

However, I know that JSON Schema documents could trip that up.  To get around that, we could use `$$`, but at some point it just becomes ridiculous.  You can only counter so many cases.

Another option is to use non-identifier charaters, which wouldn't guarantee no collisions, and would look ugly, but whould still be usable without importing anything.

```
foo['>map'](v => ({ ...v, bar: true }))
... etc.
```

Yet another option is to just dig in on `$` and require getting any _props_ that begin with `$` via methods.

```
foo.bar
// sugar for foo.$get('bar')
foo.$baz // not permitted!
// must use this instead:
foo.$get('$baz')
```

Of course, this is if you want to keep methods and props on the same thing.  Really, free functions are the best way, but then you have to import them, so, eh.  The idea for using `$` for methods comes from Vue's special methods for handling certain mutations prior to the use of Proxies in v3.


### Use in Templates?

Just make templates use the value-getter method of any stream they find.  Probably `someStream.$value()` or whatever.


### Updates

Usually, most things can be done with just pushing a new value on.

```
s.$push(nextValue)
```

I suppose you could also use a function to update based on the prior value, which basically turns a stream temporarily into `a.$reduce(fn, seed)` except that the seed is the previous value, and the next value is closed over instead of an argument.

```
s.$update(prev => prev + 1)
```


### Vueish Components?

I think that this could work in a more or less Vueish way, taking the above tack:

```js
export default {
  props: {
    fooId: {
      type: String,
      required: true,
    },
  },

  data() {
    return {
      started: false,
      poked: false,
      rejiggered: false,
    }
  },

  computed() {
    shouldDoThing() {
      // more verbose than `return this.started && this.poked && this.rejiggered`.
      // return this.$stream.combine([this.started, this.poked, this.rejiggered])
      //   .$map(([started, poked, rejiggered]) => (started && poked && rejiggered))
      // granted, this could be done with:
      return this.started.$combine(this.poked, this.rejiggered)
        .$map((vs) => vs.every(v => Boolean(v)))
      // but it's still longer than the imperative equivalent.
    },

    // but things like this are simpler.
    lastAction() {
      return this.$stream.takeLatest([
        this.started.$map(v => (['started', v])),
        this.poked.$map(v => (['poked', v])),
        this.rejiggered.$map(v => (['rejiggered', v])),
      ])
        .$map(([action, sense] = []) => {
          switch (action) {
            case 'started':
              return sense ? 'You started' : 'You stopped'
            case 'poked':
              return sense ? 'You poked' : 'You unpoked'
            case 'rejiggered':
              return sense ? 'You rejiggered' : 'You unjiggered'
            default:
              return '...'
          }
        })
    },
  },
}
```

We basically end up with Cycle.js but with nicer templates.  Herp.

Idly, `watch` functions would really be done like:

```js
this.s.$reduce((acc, v) => [v, acc[0]], []).$tap(spread(fn))
```

Those streams would be purely side-effectual.

The exact implementation of the templating function would vary from how Vue does it, since I'm replacing the underlying observer-based structure with a stream-based one.  It might have to vary from how Cycle does it, too.  I suppose one way would be to essentially extract the values from the streams and re-input them into any props, or render them as is in the case of where they're being used as the content itself.

Ideally, we would end up converting a template to something like Cycle's render function, albeit rendering the VNodes Vue uses rather than whatever Cycle does.  (Although I think Cycle's driver uses snabbdom too? (Answer: Yes, it does.)  I recall that Motorcycle does.)  The main thing is determining how we actually know what values to extract.

We could do it lazily by tracking the accessed props the first time then just creating a new function next time with only those props.  The main issue is, I think, that until the render function is called, we don't know if something being accessed on `this` is a plain value or a stream.  We could probably take a page from the aforementioned laziness and track what props are streams when accessed and what props aren't.

My first thought for how that'd work in practice is that, the first time, all streams would be `combine`d and mapped through a render function.  Then, the output of that mapped stream is fed to another stream which acts as the actual _fixed_ render output stream.  But, this initial render stream is also fed to another stream that analyzes access and produces some extra output, including what all props were accessed and if they were streams or now.

That is then used to create a new render output stream which _replaces_ the old one in connecting to the _fixed_ render output stream.

Seems like a nice first whack, but also seems rather more complicated.  I don't like replacing streams part way through.

Another option is to create the actual render function at `created` time rather than `beforeCreate` so that all the data stuff is present, and just assume all props (data, props, computed) are statically defined. (they should be.)

Obviously, the easiest way would be to stick purely with Streams as Cycle does.



## Sticking with Vue

One of the nicer things about Vue is that it encourages pragmatic extension, though of course such tools also enable shooting your self in the foot not just once, but automating said footshooting.  It's for this reason that advanced features are always advised to be used with caution.  While it is true that using them in production with out an idea of the ramifications can lead to Massive Trouble, such warnings should still be taken as encouragement to experiment with things in non-production projects.


### Take-Latest (or Merge)

We could do a sort of variant of a computed property called a `withLatest` property which implements the above behavior.  This is different from a normal computed property because we're not concerned with the current value of every single property we're sourcing from, we're concerned with which one was the latest.

This requires a bit of thought: In streams, we're concerned with events through time, but in Vue, we're concerned with values and their changes.  This in mind, we can now draft an implementation.

First, it's usage:

```js
export default {
  mixins: [TakeLatest],

  takeLatest: {
    foo: {
      // These should be either a string-path or a function that can be passed to this.$watch.
      sources: [
        // You can watch just the value itself.
        'bar',
        // Or you can pass a computed-value function.
        // A good way to use this is to tag the source.
        function baz() { return { from: 'baz', value: this.baz } },
        // Functions are also handy for, among other things:
        // - Sourcing from two props simultaneously (as opposed to separately)
        // - Transforming a source before the scan
        function beepAndBoop() {
          return { from: 'beepAndBoop', beep: this.beep, boop: this.boop };
        },
      ],
      // startWith must be a function, for the same reasons as data().
      startWith() {
        return { from: '', value: null };
      },
      handler(sourceValue, prevSourceValue) {
        // you can now return a new value for this.foo based on the current this.foo
        // and the new value from sourceName/sourceValue,
        // optionally with the previous sourceValue.
        return { from: sourceValue.from || 'bar', value: sourceValue };
      },
    },
  },
}
```

And here, a draft implementation:

```js
// The TakeLatest mixin.
export default {
  data() {
    return Object.keys(this.$options.takeLatest)
      .map((key) => {
        const { startWith } = this.$options.takeLatest[key];
        if (startWith) {
          if (typeof startWith !== 'function') {
            throw new Error(`Invalid definition for takeLatest.${key}: 'startWith' must be a function`);
          }

          return { [key]: startWith.call(this) };
        }
      })
      .reduce((dataProps, nextProp) => Object.assign(dataProps, nextProp), {})
    ;
  },

  beforeCreate() {
    Object.keys(this.$options.takeLatest).forEach((key) => {
      const { sources, handler } = this.$options.takeLatest[key];

      if (! sources || ! Array.isArray(sources)) {
        // TODO: Type-check the items in sources.
        throw new Error(`Invalid definition for takeLatest.${key}: 'sources' must be an array`);
      }

      if (! handler || typeof handler !== 'function') {
        throw new Error(`Invalid definition for takeLatest.${key}: 'handler' must be a function`)
      }

      // TODO: Allow for passing $watch options.
      sources.forEach((source) => {
        this.$watch(source, function (nextValue, prevValue) {
          this[key] = handler.call(this, nextValue, prevValue);
        });
      });
    });
  },
};
```

I think that many reactive stream paradigms can be implemented, it's mainly that they're not implemented out of the box that makes things kind of interesting to work with.
