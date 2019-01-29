Computed Collections with Settable Elements
===========================================

Maybe worth it?

Thought:
- We can iterate over a collection with `v-for`.
- We can replace a computed collection if that computed collection has a setter defined.
    - i.e. we can do `this.computedCollection = [...]`
- We cannot replace an element in that computed collection.
    - i.e. we don't get a reactive update when doing `this.computedCollection[index] = next`
    - Don't think Vue < 3 can do that, either, because you need proxies to detect that.  Thus, you'd need to do some sort of function call, which means no `v-model` for you.  Boo.
- We can define getter/setter behavior with `Object.defineProperty` or `{ get foo() {}, set foo(next) {} }`

Conclusion:
- Create manual proxies in our collection.

Basically, instead of returning `Array<T>` we would return `Array<{ value: T }>`, or more precisely `Array<{ get value: () => T, set value: (next: T) => void }`.  Thus, we no longer need to define setter functions elsewhere; rather, we can define them in the computed value getter itself, where they should be.

```js
export default {
    computed: {
        collection: {
            get() {
                return this.underlying.map(
                    (item, index) => {
                        const itemWrapper = {}
                        // NOTE: Using defineProperty so we can use arrow functions
                        // for the getter and setter.
                        Object.defineProperty(itemWrapper, 'value', {
                            get: () => {
                                return item
                            },
                            set: (next) => {
                                // Replacing whole thing.
                                this.underlying = this.underlying.map((prevItem, prevIndex) => (
                                    prevIndex === index
                                        ? next
                                        : prevItem
                                ))
                                // Could also just splice the underlying:
                                //   this.underlying.splice(index, 1, next)
                                // Or, emit an update event:
                                //   this.$emit('update:underlying', this.underlying.map(...))
                                //   this.$emit('update:underlying:item', { index, item: next })
                                // It's just whatever you need it to do.
                            },
                        })
                        // Since this array is a computed prop, we don't need to worry
                        // about reactivity, or more specifically, about hiding from it.
                        return itemWrapper
                    },
                    []
                )
            },
            set(next) {
                this.underlying = next.map(item => item.value)
            }
        }
    }
}
```

It's not as clean as just overwriting the thing itself, but it does work.  Some memoization might help, but unless you're dealing with huge collections the object creations probably won't cause any issues.

Another upshot of this: We can attach as many read/write props as we want to a single element, meaning we could use this as a generic wrapper object for any additional values meaningful to us on a per-element basis.  Thus you can avoid having to index into parallel arrays in the template, and it makes the whole `item.value` accessing seem a little less awkward.  It's just part of an interface, see!  Hah hah.  Hah.

An example might be dynamic form elements, where you'd have `item.value`, which of course is what you want to `v-model` in the first place, but also `item.label`, `item.required`, and any other number of things.

One thing you do have to be careful of is that you're manually creating reactivity here, Vue doesn't help you.  This means only the props you define a setter for will actually do anything reactive.  Just think of it like another integration with a non-Vue thing.
