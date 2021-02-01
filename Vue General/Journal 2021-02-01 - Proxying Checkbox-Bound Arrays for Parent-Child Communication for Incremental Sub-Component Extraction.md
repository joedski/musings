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

If that's the case, then we should be able to trivially verify this:

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

Basically we need to do this:

```js
export default Vue.extend({
  props: {
    itemOptionArray: { type: Array, required: true },
    itemSelectionArray: { type: Array, required: true },
  },

  data() {
    return {
      itemSelectionArrayLocal: [],
    };
  },

  watch: {
    itemSelectionArray(next, prev) {
      if (next !== prev) {
        this.itemSelectionArrayLocal = next;
      }
    },

    itemSelectionArrayLocal(next, prev) {
      if (next !== prev) {
        this.$emit('update:itemSelectionArray', next);
      }
    },
  },
});
```
