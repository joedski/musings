Journal 2021-02-01 - Proxying Checkbox-Bound Arrays for Parent-Child Communication for Incremental Sub-Component Extraction
========

Suppose I'm refactoring a component to move a form or modal or something into a sub-component, and that in this form there's a list of checkboxes bound to an array.

That is, something like this:

```html
<input
  v-for="item in itemOptionArray"
  :key="item.id"
  type="checkbox"
  v-model="itemSelectionArray"
  :value="item"
>
```

This directly mutates the array, which is effective within a component but ever so slightly complicates things when that array is coming from the parent.

First of all, just how is the `<input>` interacting with the array?

- I presume that it's returning a new array each time, with the `value` item either appended to the end or removed from it.
    - I presume so because well behaved components should not mutate props they receive.

If that's the case, then we [should be able to trivially verify this](./Journal%202021-02-01%20-%20Proxying%20Checkbox-Bound%20Arrays%20for%20Parent-Child%20Communication%20for%20Incremental%20Sub-Component%20Extraction.files/determination-1-update-style/index.html)...

```html
<template>
  <div>{{ result }}</div>
  <ul>
    <li
      v-for="item in itemOptionArray"
      :key="item.id"
    >
      <input
        type="checkbox"
        v-model="itemSelectionArray"
        :value="item"
      >
      {{ item.label }}
    </li>
  </ul>
</template>
```

```js
export default Vue.extend({
  data() {
    return {
      result: 'Waiting...',
      itemSelectionArray: [],
    };
  },

  computed: {
    itemOptionArray() {
      return [
        { label: 'Eggs' },
        { label: 'Bacon' },
        { label: 'Spam' },
      ];
    },
  },

  watch: {
    itemSelectionArray(next, prev) {
      if (next !== prev) {
        this.result = 'Array replaced!';
      }
      else {
        this.result = 'Array mutated!';
      }
    },
  },
});
```

The result is indeed that the array is replaced.  That's good to know, as we can just emit that straight back up, with no need for an intermediate `data` prop.

Basically we need to do this:

```js
export default Vue.extend({
  props: {
    itemOptionArray: { type: Array, required: true },
    itemSelectionArray: { type: Array, required: true },
  },

  computed: {
    itemSelectionArrayReactive: {
      get() { return this.itemSelectionArray; },
      set(next) {
        if (next !== this.itemSelectionArray) {
          this.$emit('update:itemSelectionArray', next);
        }
      },
    },
  },
});
```

> Aside: I usually name the computed prop `${propName}Reactive` because it's the "reactive" version of the read-only prop.

This means we get exactly the same sort of proxying we do for any other prop we want to make reactive but also stateless.

That's easy enough to boil down to a utility function, really:

```js
function syncProp(propName) {
  const updateEventName = `update:${propName}`;

  return {
    get() {
      return this[propName];
    },

    set(next) {
      if (next !== this[propName]) {
        this.$emit(updateEventName, next);
      }
    },
  };
}
```

That gives us this:

```js
export default Vue.extend({
  props: {
    itemOptionArray: { type: Array, required: true },
    itemSelectionArray: { type: Array, required: true },
  },

  computed: {
    itemSelectionArrayReactive: syncProp('itemSelectionArray'),
  },
});
```
