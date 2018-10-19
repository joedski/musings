Reactive Updates on Sub-Props and Sub-Elements of Computed Properties
=====================================================================

> NOTE: My conclusion here is, well, I haven't yet found a good ideomatic way to do assignments to elements of computed collections, outside of setter methods.

Computed props are great, they allow automatic derivation of source data, meaning less manual transformation work on your part.  Even better, they have a get/set form which allows for bidirectional automatic derivation, greatly simplifying things like complex form elements.

An issue arises however when dealing with Collections, be they Objects or Arrays, or rather, with updates to individual Elements within those Collections.  The most obvious solution is to update them with a method call, but this moves the Element update logic to a separate method, away from the Computed Property.  To make things worse, we already know we cannot do `computedProp[index] = updatedValue` because Vue 2 cannot detect changes to array elements like that due to JS limitations.  That won't be available until the Proxy based reactivity model lands.

In any case, the core issue remains: updating Computed Properties by updating their constituent elements.



## Trials

All of these trials can be found implemented in the [companion directory](./Reactive%20Updates%20on%20Sub-Props%20and%20Sub-Elements%20of%20Computed%20Properties%20(Case%20Implementations)), each as a separate HTML file.  Note that they are written in ES6 and thus require a recent browser.  No IE11 or old Safari!


### Case 1: The Usual Solution

```js
const TestComponent = {
  data() {
    return {
      settings: [
        { name: 'foo', value: '' },
        { name: 'bar', value: 'barbar' },
      ],
      defaultSettings: [
        { name: 'foo', value: 'FOO' },
        { name: 'bar', value: 'BAR' },
        { name: 'baz', value: 'BAZ' },
      ],
    }
  },

  computed: {
    coalescedSettings: {
      get() {
        console.log('computed(coalescedSettings) get()')
        return this.defaultSettings.map(defaultItem => {
          const setItem = this.settings.find(item => item.name === defaultItem.name)
          // NOTE: For the sake of example, purposefully creating
          // new objects to prevent automatic updates.
          if (setItem) return { ...defaultItem, value: setItem.value }
          return { ...defaultItem }
        })
      },
      set(next) {
        console.log('computed(coalescedSettings) set()')
        this.settings = next.filter(nextItem => {
          const defaultItem = this.defaultSettings.find(item => item.name === nextItem.name)
          if (nextItem.value === defaultItem.value) return false
          return true
        })
      },
    }
  },

  template: `
    <div class="test-component">
      <ul>
        <li v-for="setting in coalescedSettings" :key="setting.name">
          <div>{{ setting.name }}: <strong>{{ setting.value }}</strong></div>
          <div>
            <input
              type="text"
              v-model="setting.value"
            />
          </div>
        </li>
      </ul>
    </div>
  `,
}
```

This doesn't work: Since `coalescedSettings` is a computed property, reactivity-wise its substituents are not related at all to the original source data.  Updating `setting.data` thus doesn't result in any updates.  Only `computed(coalescedSettings) get()` gets logged, never `computed(coalescedSettings) set()`.

To work around this, we have to use a method to update things.

```js
const TestComponent = {
  // ...

  methods: {
    updateCoalescedSetting(name, nextValue) {
      this.coalescedSettings = this.coalescedSettings.map(coalescedItem => {
        if (coalescedItem.name === name) {
          return {
            ...coalescedItem,
            value: nextValue,
          }
        }

        return coalescedItem
      })
    }
  },

  template: `
    <div class="test-component">
      <ul>
        <li v-for="setting in coalescedSettings" :key="setting.name">
          <div>{{ setting.name }}: <strong>{{ setting.value }}</strong></div>
          <div>
            <input
              type="text"
              :value="setting.value"
              @input="updateCoalescedSetting(setting.name, $event.target.value)"
            />
          </div>
        </li>
      </ul>
    </div>
  `,
}
```


### Consideration: Any Other Ways?

That is the most obvious solution.  Are there any other possibilities?

- Presuming that Computed Props are implemented as a combination of `data` and `watch`, perhaps we could simply add a deep watcher ourselves?
- Instead of returning substituents directly, return getter/setters.


### Case 2: Testing Data/Watch Hypothesis

```js
const TestComponent = {
  // ...
  watch: {
    coalescedSettings: {
      deep: true,
      handler(next) {
        console.log('watch(coalescedSettings)')
        // Substituent was updated rather than self.
        if (next === this.coalescedSettings) {
          // Copy so we don't infinite-loop.
          this.coalescedSettings = next.slice()
        }
      },
    }
  },
  // ...
}
```

In this case, nothing happened.  Looks like my hypothesis was incorrect.  It is probably implemented in some more efficient scheme under the hood and, anyway, this hypothesis itself was presumptive of internal implementation details, which is usually a bad idea to depend on.


### Case 3: Getter/Setter Functions

This could be considered a slightly worse version of the Setter Method version of things: it's rather complex to implement for what you get.  The main benefit is that you get the setter implementation co-located with the base derivation.  Theoretically, the underlying machinery could be abstracted, though, leaving you to implement only the derivations.

```js
const TestComponent = {
  // ...
  computed: {
    coalescedSettings: {
      get() {
        console.log('computed(coalescedSettings) get()')
        return this.defaultSettings
        .map(defaultItem => {
          const setItem = this.settings.find(item => item.name === defaultItem.name)
          // NOTE: For the sake of example, purposefully creating
          // new objects to prevent automatic updates.
          if (setItem) return { ...defaultItem, value: setItem.value }
          return { ...defaultItem }
        })
        .map((item, index) => {
          return Object.assign((...args) => {
            if (!args.length) return item
            const nextItem = args[0]
            this.coalescedSettings = this.coalescedSettings.map(prevItem => {
              if (prevItem().name === nextItem.name) {
                return () => nextItem
              }
              return prevItem
            })
          }, { $value: item })
        })
      },
      set(next) {
        console.log('computed(coalescedSettings) set()')
        this.settings = next.filter(nextItem => {
          const defaultItem = this.defaultSettings.find(item => item.name === nextItem().name)
          if (nextItem().value === defaultItem.value) return false
          return true
        })
        .map(item => item())
      },
    },
  },
  // ...
  template: (`
    <div class="test-component">
      <ul>
        <li v-for="setting in coalescedSettings" :key="setting().name">
          <div>{{ setting().name }}: <strong>{{ setting().value }}</strong></div>
          <div>
            <input
              type="text"
              :value="setting().value"
              @input="setting({ ...setting(), value: $event.target.value })"
            />
          </div>
        </li>
      </ul>
    </div>
  `),
}
```

There's room for concision, but as can be seen, this breaks from Vue's usual modality of plain values and assignments.  Not to mention, since the actual substituent value is obscured by a getter function, we lose the benefits of computed props in the Vue Dev Tools.  It's also infectious, not to mention just plain difficult to remember to do.

We could just change the interface to `{ $value, $set }` or something.  I dunno.  That would give back Dev Tool friendliness, at least.

```js
const TestComponent = {
  // ...
  computed: {
    coalescedSettings: {
      get() {
        console.log('computed(coalescedSettings) get()')
        return this.defaultSettings
        .map(defaultItem => {
          const setItem = this.settings.find(item => item.name === defaultItem.name)
          // NOTE: For the sake of example, purposefully creating
          // new objects to prevent automatic updates.
          if (setItem) return { ...defaultItem, value: setItem.value }
          return { ...defaultItem }
        })
        .map(item$value => ({
          $value: item$value,
          $set: nextItem$value => {
            this.coalescedSettings = this.coalescedSettings.map(prevItem => {
              if (prevItem.$value.name === item$value.name) {
                return { $value: nextItem$value }
              }
              return prevItem
            })
          },
        }))
      },
      set(next) {
        console.log('computed(coalescedSettings) set()')
        this.settings = next.filter(nextItem => {
          const defaultItem = this.defaultSettings.find(item => item.name === nextItem.$value.name)
          if (nextItem.$value.value === defaultItem.value) return false
          return true
        })
        .map(wrapped => wrapped.$value)
      },
    }
  },
  // ...
  template: (`
    <div class="test-component">
      <ul>
        <li v-for="setting in coalescedSettings" :key="setting.$value.name">
          <div>{{ setting.$value.name }}: <strong>{{ setting.$value.value }}</strong></div>
          <div>
            <input
              type="text"
              :value="setting.$value.value"
              @input="setting.$set({ ...setting.$value, value: $event.value })"
            />
          </div>
        </li>
      </ul>
    </div>
  `),
}
```

Still really ugly to implement and use, though.


### Case 4: Compromise?

Maybe we can just define a computed-prop level setter?

```js
const TestComponent = {
  // ...
  computed: {
    coalescedSettings: {
      get() {
        console.log('computed(coalescedSettings) get()')
        return Object.assign(this.defaultSettings.map(defaultItem => {
          const setItem = this.settings.find(item => item.name === defaultItem.name)
          // NOTE: For the sake of example, purposefully creating
          // new objects to prevent automatic updates.
          if (setItem) return { ...defaultItem, value: setItem.value }
          return { ...defaultItem }
        }), {
          $updateItem: (name, nextValue) => {
            this.updateCoalescedSetting(name, nextValue)
          }
        })
      },
      set(next) {
        console.log('computed(coalescedSettings) set()')
        this.settings = next.filter(nextItem => {
          const defaultItem = this.defaultSettings.find(item => item.name === nextItem.name)
          if (nextItem.value === defaultItem.value) return false
          return true
        })
      },
    }
  },

  methods: {
    updateCoalescedSetting(name, nextValue) {
      this.coalescedSettings = this.coalescedSettings.map(coalescedItem => {
        if (coalescedItem.name === name) {
          return {
            ...coalescedItem,
            value: nextValue,
          }
        }

        return coalescedItem
      })
    }
  },

  template: (`
    <div class="test-component">
      <ul>
        <li v-for="setting in coalescedSettings" :key="setting.name">
          <div>{{ setting.name }}: <strong>{{ setting.value }}</strong></div>
          <div>
            <input
              type="text"
              :value="setting.value"
              @input="coalescedSettings.$updateItem(setting.name, $event.target.value)"
            />
          </div>
        </li>
      </ul>
    </div>
  `),
}
```

This is probably the easiest to work with, but also presents the least advantage.  Might as well just use a method!
