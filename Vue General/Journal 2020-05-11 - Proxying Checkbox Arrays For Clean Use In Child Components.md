Journal 2020-05-11 - Proxying Checkbox Arrays For Clean Use In Child Components
========

One of the annoying things about how Vue handles Checkbox `v-model` with array values is that it mutates the array directly.  Now, this is more efficient than always emitting a new array, but the majority of situations aren't appreciably affected by this, and direct mutation always makes it harder to break things into sub-components without resorting to sharing state across them all which has its own problems.

What I'd like to do is to be able to use `<input type="checkbox" v-model="...">` without having to use the separate `checked` and `@change` things, but since that's based around mutation of a value it means I have to proxy it.  It also means I can't use an array directly unless I feel like making my own array proxy (and without actual Proxy support (thanks IE), I don't feel like bothering.)



## General Thoughts

The basic idea is simple enough: create a reactive proxy for each element, but lazily because we could be dealing with lists of thousands of elements and in the vast majority of cases we'll only be showing hundreds at a time tops.

Some quick tech thoughts then:

- Since we don't want to allow mutation of elements of a value, we're going to stick to the Boolean `v-model`.
- If we're dealing with objects, we want to use `WeakMap`, and if dealing with primitives, `Map`.
- We can actually use a `Set` for the backing data, since we have to create a copy anyway when we emit updates.

An initial thought on the API:

```js
const p = ReactiveSetProxy({
    value: () => this.someCollection,
    update: (next) => this.$emit('update:someCollection', next),
});

console.log(this.someCollection); // []
console.log(p.for(elem).value); // false
p.for(elem).value = true;
console.log(p.for(elem).value); // true
console.log(this.someCollection); // [elem]
```



## First Whack Implementation

```js
function isPrimitive(v) {
    if (v == null) return true;

    if (typeof v === 'object' || typeof v === 'function') {
        return false;
    }

    return true;
}

class ReactiveSetProxy {
    constructor({ value, update }) {
        this.value = value;
        this.update = update;
        this.lastValue = null;

        // Membership Accessor Caches.
        this.objectCache = new WeakMap();
        this.primitiveCache = new Map();
    }

    for(elem) {
        const cache = isPrimitive(elem)
            ? this.primitiveCache
            : this.objectCache;

        if (cache.has(elem)) return cache.get(elem);

        // Only because we can't do arrow-fns for accessors.
        const $this = this;

        const accessor = {
            get value() {
                return $this.value().includes(elem);
            },
            set value(next) {
                const value = $this.value()
                const elemIsInValue = value.includes(elem);

                if (!next && elemIsInValue) {
                    $this.update(value.filter(other => other !== elem));
                    return;
                }

                if (next && !elemIsInValue) {
                    const nextValue = value.slice();
                    nextValue.push(elem);
                    $this.update(nextValue);
                }
            },
        };

        cache.set(elem, accessor);

        return accessor;
    }
}
```

That probably works as a first good whack, but isn't very efficient under multiple reads.  Really needs a Set-backed cache.



## Second Whack: Caching Membership With a Set

Without a Watch, we can't really preemptively update any cache, but we _can_ still touch the original value thus creating the data dependency in Vue itself.

Basically what we do then is just like before, but instead of getting the value and directly using it, we get the value then compare it to a cached copy.  If they're the same reference, we can use the old Set, and if not we empty the Set and start over.



## Third Whack: Take A Page Out Of Vue's Book

And wish for Proxy support.  In Vue 3, we could just use a Proxy and be done with it.  In Vue 2 however this is done by just iterating over all array values and creating getters/setters for each one using `defineProperty`.  Annoying, but there you go.


### The Watching Way

The simplest and probably least-rather-annoying way is to just do a semi-computed value via a watch.  That is, watch the input prop, update an internal state prop to a new map of the input, and deep-watch changes on the input prop.

The naive way is to just wholly replace the state value each time with a new mapped array of the input.  Obviously, replacing the whole state value is going to twig the deep-watch on that state value, so we just need to skip any changes where the next array is a new object in memory from the previous array.

Another way is to truncate the state value then assign to each value (requireing the use of `this.$set()` because we're setting new properties), however that complicates filtering of updates due to prop change.

Ultimately, though, this is avoiding the real desire, which is just mapping form-value changes to emitted updates while preserving array-item behavior in the template.


### The (Pseudo) Proxying Way

Lots of `Object.defineProperty()` calls with both `get` and `set`.  Yep.



## Fourth Whack: Just Augment the Input Records

In the Template, we're concerned with the items being rendered in a table.  In the Controller, we're concerned with Records and a Set of Selected Records.

We can just create a derived view of the Records which have a reactive field that itself is the update indirection.

That is,

```js
export default {
  computed: {
    itemListWithReactiveSelection() {
      return this.itemList.map(
        item => this.selectableItemFromItem(item)
      );
    },
  },

  methods: {
    selectableItemFromItem(item) {
      const $this = this;

      return Object.assign(Object.create(item), {
        get isSelected() {
          return $this.isItemSelected(item);
        },
        set isSelected(next) {
          $this.selectItem(item, next);
        }
      });
    },

    isItemSelected(item) {
      return this.selectedItemIdSet.includes(item.id);
    },

    selectItem(item) {
      const itemIdsSetWithUpdate = this.selectedItemIdSet.filter(
        id => id !== item.id
      );

      if (itemIdsSetWithUpdate.length === this.selectedItemIdSet.length) {
        itemIdsSetWithUpdate.push(item.id);
      }

      this.$emit('update:selectedItemIdSet', itemIdsSetWithUpdate);
    },
  },
};
```

Then in the template we just use `v-model="row.item.isSelected"` or `value.sync`.

That's a lot to repeat every time we want to do this, and the update part is especially annoying.

```js
class SelectableItemListController {
  constructor($context, getItemList, options = {}) {
    this.$context = $context;

    assert(typeof options.getItemList === 'function');
    assert(typeof options.getSelectedItemSet === 'function');
    assert(typeof options.selectedItemFromItem === 'function');
    assert(typeof options.onUpdateSelectedItemSet === 'function');

    this.options = {
      ...SelectableItemListController.defaultOptions,
      ...options,
    };
  }

  get itemList() {
    return this.sourceItemList.map(
      item => this.selectableItemFromItem(item)
    )
  }

  get sourceItemList() {
    return this.getItemList.call(this.$context, this.$context);
  }

  get sourceSelectedItemList() {
    return this.getSelectedItemSet.call(this.$context, this.$context);
  }

  selectableItemFromItem(item) {
    // Can't specify getters/setters as arrow functions.
    const $this = this;

    return Object.assign(Object.create(item), {
      get isSelected() {
        // This could be sped up by pre-calclulating a Set().
        return $this.isItemSelected(item);
      },
      set isSelected(next) {
        $this.updateItemSelection(item, next);
      }
    });
  }

  isItemSelected(item) {
    const selectedItemRepresentation = this.options.selectedItemFromItem(item);

    return tihs.sourceSelectedItemList.includes(selectedItemRepresentation);
  }

  updateItemSelection(item, next) {
    const selectedItemRepresentation = this.options.selectedItemFromItem(item);

    const itemIdsSetWithUpdate = this.sourceSelectedItemList.filter(
      currentlySelectedItem =>
        currentlySelectedItem !== selectedItemRepresentation
    );

    if (itemIdsSetWithUpdate.length === this.sourceSelectedItemList.length) {
      itemIdsSetWithUpdate.push(selectedItemRepresentation);
    }

    this.options.onUpdateSelectedItemSet(itemIdsSetWithUpdate);
  }
}
```

```js
export default {
  computed: {
    selectableItemList() {
      return new SelectableItemListController(this, {
        getItemList: () => this.itemList,
        getSelectedItemSet: () => this.selectedItemIdSet,
        selectedItemFromItem: (item) => item.id,
        onUpdateSelectedItemSet: nextList => {
          this.$emit('update:selectedItemIdSet', nextList);
        },
      });
    },
  },
};
```



## Fifth Whack: What Was I Doing Again?

What I originally wanted to do was to be able to use `<input type="checkbox" :value="item.id" v-model="arrayOfSelectedValues" />` without regard to whether `arrayOfSelectedValues` is a prop or not.  Of course, in this case, it would be a controller's own-state.

Let's start from the basics, then.

What would we normally do to implement that, naively?

Probably something like this:

```html
<template>
  <ul>
    <li
      v-for="item in itemList"
    >
      <input
        type="checkbox"
        :value="item.id"
        v-model="state.selectedItemIdList"
      /> {{ item.name }}
    </li>
  </ul>
</template>
```

```js
export default {
  props: {
    itemList: { type: Array },
    selectedItemIdList: { type: Array },
  },

  data() {
    return {
      state: {
        selectedItemIdList: [],
      },
    };
  },

  watch: {
    selectedItemIdList(next) {
      // If we're just receiving the same value as from our parent,
      // don't bother doing anything?
      // That might run afoul of "don't mutate parent data".  Hm...
      if (next === this.state.selectedItemIdList) return;
      this.state.selectedItemIdList = next.concat();
    },

    'state.selectedItemIdList': {
      deep: true,
      handler(next, prev) {
        // Filter out updates from prop change.
        if (next !== prev) return;
        this.$emit('update:selectedItemIdList', next);
      },
    },
  },
}
```

Gross, because it uses own-state and mutates values within that state, but then is discarded because.  A bit suboptimal with large selections, as well, due to that concat.



## Alternatively, Don't Play With Arrays, Only Play With Changes

The most obvious option is this: don't even bother with arrays and only emit updates.

Naively that looks something like this:

```html
<template>
  <ul>
    <li
      v-for="item in itemList"
    >
      <input
        type="checkbox"
        :checked="isItemChecked(item)"
        @input="updateIsItemChecked(item)"
      /> {{ item.name }}
    </li>
  </ul>
</template>
```

```js
export default {
  props: {
    itemList: { type: Array },
    selectedItemIdList: { type: Array },
  },

  methods: {
    isItemChecked(item) {
      return selectedItemIdList.includes(item.id);
    },

    updateIsItemChecked(item) {
      this.$emit(`update:isItemChecked`, item);
    },
  },
}
```

This is lovely because it is stateless, and stateless is joyful.

The indirection is annoying though, and not being able to `v-model` is doubly so because it means having to memorize more things.  Uugh, memorizing things.  Disgusting.


### Value and Boolean Model Indinection?

```html
<template>
  <ul>
    <li
      v-for="item in itemList"
    >
      <input
        type="checkbox"
        :value="item.id"
        v-model="getModel(item).isChecked"
      /> {{ item.name }}
    </li>
  </ul>
</template>
```

```js
export default {
  props: {
    itemList: { type: Array },
    selectedItemIdList: { type: Array },
  },

  computed: {
    itemModelPrototype() {
      const $this = this;
      const $itemModel = {
        item: null,

        get isChecked() {
          return $this.isItemChecked($itemModel.item);
        }
        set isChecked() {
          return $this.updateIsItemChecked(item);
        }
      }

      return $itemModel;
    },
  },

  methods: {
    getModel(item) {
      return Object.assign(Object.create(this.itemModelPrototype), {
        item,
      });
    },

    isItemChecked(item) {
      return selectedItemIdList.includes(item.id);
    },

    updateIsItemChecked(item) {
      this.$emit(`update:isItemChecked`, item);
    },
  },
}
```
