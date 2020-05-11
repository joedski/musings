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
