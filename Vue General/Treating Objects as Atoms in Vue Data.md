Treating Objects as Atoms is Vue Data
=====================================

Vue 2.x reactifies objects by walking their own props and transforming them into getters/setters.  In particular, it will _not_ walk the Prototype Chain, as the Vue team wanted to treat instances or objects with delegates as staying instances/objects-with-delegates.

References:
1. [Issue noting that Vue doesn't walk the prototype chain](https://github.com/vuejs/vue/issues/1024)
2. [Issue brought on where another library set what was arguably an instance prop as a prototype prop, causing Vue to skip them](https://github.com/vuejs/vue/issues/7087)
3. [Vue's own high-level documentation on its reactivity model in 1.x/2.x](https://vuejs.org/v2/guide/reactivity.html)
  1. It does not however mention anything explicitly about prototypes, necessitating my further research into the matter.

> Note that Vue 1.x and 2.x are explicitly mentioned there.  I have no reason to believe that iterating only over own props will change in Vue 3.x with the move to using Proxies for great dev-friendliness justice, but I think it should still be mentioned explicitly.  That is to say, I'm pretty sure Vue 3.x will still iterate only over own props, and not walk the prototype chain.  Why?  Predictability. (except in the face of other libraries... so, so much for that.)  (TODO: Link to how 3.x will use proxies!)

The upshot is that this gives us a way to opt out of reactivifying very large objects and crashing the page: Make the very large object a prototype of an empty object!  And thanks to Douglas Crockford, there's an easy way to do that: `Object.create(protoObj[, instProps])`

```js
export default {
  data() {
    return {
      reactivified: {
        someProp: 'yay',
        anotherProp: 'woo',
      },

      notReactivified: Object.create({
        someProp: 'what',
        anotherProp: 'aww',
      }),
    }
  },
}
```

With a `data()` like this, you can cause reactive updates by setting `this.reactivified.someProp`, `this.reactivified.anotherProp`, or even setting `this.reactivified` itself to a new value.  But, you cannot cause an update by setting `this.notReactivified.someProp`, nor by setting `this.notReactivified.anotherProp`, because those values started only on the prototype of `this.notReactivified`, thus Vue just doesn't do anything with them.  But, you _can_ cause an update by setting `this.notReactivified` itself to a new value.

A big caveat, though: This will change with 3.x!  Because Vue will use Proxies, it will be able to detect prop additions and deletions, so there, setting `this.notReactivified.someProp` _will_ trigger an update.

Is this still of any value, then?  I think so.  You can't necessarily update an object that you treat this way, but you can at least treat it as an immutable atom with respect to reactivity.  That is, you can use this to treat an object as a discrete value rather than a collection of props.



## An Applicable Usage

You could then use this technique to prevent undue reactivification of things like values created by things like [daggy](https://github.com/fantasyland/daggy).  As an [example](https://medium.com/javascript-inside/slaying-a-ui-antipattern-in-react-64a3b98242c):

```js
import daggy from 'daggy'

const Loadable = daggy.taggedSum('Loadable', {
  NotAsked: [],
  Loading: [],
  Errored: ['error'],
  Loaded: ['response'],
})

export default {
  props: {
    thingId: {
      type: String,
      required: true,
    },
  },

  data() {
    return {
      thing: Object.create(Loadable.NotAsked()),
    }
  },

  mounted() {
    this.fetchThing()
  },

  methods: {
    fetchThing() {
      this.thing = Object.create(Loadable.Loading())

      return axios.get(`/thing/${this.thingId}`)
        .then((response) => Loadable.Loaded(response))
        .catch((error) => Loadable.Errored(error))
        .then((thing) => {
          this.thing = Object.create(thing)
          return this.thing
        })
    }
  },
}
```

This works here because values from daggy are meant to be treated as immutable atoms.  They're not really, of course, but we can treat them as such, and daggy's API encourages treating them as such.



## Final Thoughts

While this is handy, you still have to watch out: Objects that have their own state, that is they self-mutate, are a poor fit for this technique.  This is explicitly called out somewhere in Vue's docs.  (TODO: Link to that!)  It's really more suited for objects that can be treated as immutable discrete values, hence use of the term "atom".

Technically, you can (maybe?) get around that by applying another layer of indirection, `Object.create({ value: statefulObject })`, but at that point you might as well just do something like `this.propNotDefinedInData = statefulObject` and be done with it.  Simple is better, there.
