Complex Props and Stateless Components
======================================

This entire document can be summarized as: Computed Props support Get and Set, so use them both to setup bi-directional data pipelines and circumvent Data Props.

Of course, there's a bit more nuance to it than that.  This is useful in any component you want to minimize state in, but is extremely useful when writing things like compound form fields that must also take into account multiple props besides the model prop.

A most excellent side benefit of this methodology is that you can see all of the derived values directly in the Vue Dev Tools.  Methods don't allow that!



## Deep Dive

The entire idea here is this:
- Eliminate all unnecessary State.  Usually by having little in or omitting entirely the `data()` option.
- Where possible, have the Parent manage persisting State.
- Define get/set derivations for anything you need that's derived from the State.
- When the State from the Parent updates, all the derivations automatically recalculate.
- When you update one of the derivations, that change is automatically propagated both back up to the Parent to update State, as well as to all other affected derivations.


### On V-Model

In the Vue docs, it explicitly tells us that there's no bi-directional binding.  Instead, what `v-model` does is setup two things:
- It sets a model-prop to the given value: `:value="someModelValue"`
- It sets an event handler to handle model-events to update that given value on itself: `@input="nextValue => {someModelValue = nextValue}"`

In our component then, we receive the value on the prop `value` (or whatever `$options.model.prop` says) and emit updates to that `value` on the `input` event (or whatever `$options.model.event` says).

With Computed Props, we can set the behavior both when getting a given prop and when setting it.  We can do anything we want with these get/set pairs, including emitting events instead of setting things:

```js
export default {
  // Shown for illustrative purposes...
  // these are the default values.
  model: {
    prop: 'value',
    event: 'input'
  },

  // ...

  computed: {
    derivedValue: {
      get() {
        return someParsingThing(this.value)
      },
      set(next) {
        this.$emit('input', someUnparsingThing(next))
      }
    }
  },
}
```

Notice that we don't actually store the value.  We could, and there might be situations where it's necessary to do so, but in the mean time, if we don't have to, we shouldn't.

What if we have some fan-out from the value prop?  Obviously things are a little less direct, but it's not too difficult: We just need some methods to act as a bit of extra glue:

```js
// These are just stand-ins for intended functionality.
// In actual implementations, they would likely not be external Functions
// unless they were being used across many components.
function combineParams(params, defaults) { /* ... */ }
function combineThingers(selectedThingers, allowedThingers) { /* ... */ }

export default {
  computed: {
    coalescedParams: {
      get() {
        return combineParams(
          this.value,
          this.defaultParams
        )
      },
      set(next) {
        // Here, we simply leave any default values in place.
        // Other times, we might want to filter any that match their default value.
        this.$emit('input', next)
      }
    },
    selectedThingersParam: {
      get() {
        return combineThingers(this.getParam('selectedThings', []), this.allowedThingers)
      },
      set(next) {
        if (areArraysSame(this.selectedThingersParam, next)) return

        this.setParam('selectedThingers', next)
      }
    },
    doohickiesParam: {
      get() {
        return this.getParam('doohickies', '').split(',')
      },
      set(next) {
        if (areArraysSame(this.doohickiesParam, next)) return

        this.setParam('doohickiesParam', next.join(','))
      }
    }
  },

  methods: {
    getParam(name, elseValue) {
      const paramItem = this.coalescedParams.find(item => item.name === name)
      if (paramItem && paramItem.value != null) return paramItem.value
      return elseValue
    },
    setParam(name, nextValue) {
      this.coalescedParams = this.coalescedParams.map(item => (
        item.name === name
          ? { ...item, value: nextValue }
          : item
      ))
    },
  },
}
```

Things to note:
- We coalesce the value with defaults at one computed value rather than checking everywhere.
- Getters take care of Parsing and Normalizing values into a consistent type.
- Setters take care of Difference-Checking and Unparsing values for the external interface.
- Inwards derivations are cached by this component, but outwards back-derivations are cached by the parent.  That new value only reaches this component if the parent assigns it.
- Spurious Update Prevention is handled by each param, since the equality determination could be very different for each param.
  - Outside of those, everything else directly applies/propagates updates.


### Interacting With Other Bi-Directional Components

Using this same methodology, we can handle both the assignment of a value to and updating of that value from another component.

```html
<fancy-select
  :options="doohickiesOptions"
  v-model="currentDoohickyParam"
/>
```

```js
export default {
  computed: {
    // options are read only, no need to set them.
    doohickiesOptions() {
      return this.doohickiesParam.map(paramItem => ({
        value: paramItem.id,
        label: paramItem.name,
      }))
    },

    currentDoohickyParam: {
      get() {
        return this.getParam('currentDoohicky', null)
      },
      set(next) {
        if (
          this.currentDoohickyParam === next ||
          (!next && !this.currentDoohicky)
        ) {
          return
        }

        this.setParam('currentDoohicky', next || null)
      }
    }
  }
}
```

Thus, this modality extends infinitely downwards.


### Easier Refactors and Extensions

This methodology naturally lends itself to extension: By creating derivations for just what we need, we both create interfaces that best fit the use cases while at the same time not having any one thing depend on the behavior of other things.

Suppose we needed to switch out what we were using for selection of a `currentDoohickyParam`, but other things still depended on the current shape of `currentDoohickyParam`, which indeed is already a pretty minimal shape what with probably being a primitive value.  We can simply create another computed property based on `currentDoohickyParam` that both translates it into whatever is used by this mysterious new selection component as well as translate back from what it emits.
