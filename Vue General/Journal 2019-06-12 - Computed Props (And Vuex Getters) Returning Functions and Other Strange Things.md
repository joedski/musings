Journal 2019-06-12 - Computed Props (And Vuex Getters) Returning Functions and Other Strange Things
========

> NOTE: For the purposes of this discussion, and because the underlying implementation bears this out, Vuex Getters are considered the same as Computed Props.



## The Issue

The most common case given for having a Computed Prop that returns a Function is that the person would like to have a parametrized getter.

In the most common case this is said to give no cache advantage and, in fact, could even cause issues with not setting up proper subscriptions at all, thus causing unexpectedly unreactive elements.

This is due to the fact that the returned function is itself being called _outside_ of the Computed Prop Computer Function.  Obviously, this behavior is an Abstraction Leakage of the Vue Framework, and arises from how subscriptions are handled.  Long story short: Property Paths for Subscription are only tracked within the _synchronous body_ of the the Computor Function itself.  If you return a Function from the Computor Function, then any call of that returned Function happens outside of the synchronous body of the Computor Function.

> NOTE: I use "Computor Function" here to refer to the function that computes the value of of the Computed Prop.

As an example, suppose you have a Computed Prop that returns a Function that searches for values in a collection.  The issue here is that, your returned Function will work, and will return values from that collection when called, but Vue doesn't register any subscriptions to those found values!  And whether any updates at all are subscribed depends on whether or not you pulled out the collection into a local variable _before_ defining the returned function!

```js
new Vue({
    computed: {
        fooById() {
            // Vue now creates a subscription to `store.state.someCollection`.
            const coll = this.$store.state.someCollection;
            // Calls to this function here occur after fooById() returns!
            // Thus no new subscriptions are created!
            return function findFooById(id) {
                return coll.find(e => e.id === id);
            };
        },
    },
});
```


### A Subtle Note: Derived Data vs Actual Underlying Data

A followup on 2019-07-17.  EDIT: Which will have to be followed up again later, with a rewrite.  But, eh, that's writing for you.

It may seem like all doom and gloom from the above section, but there's actually a more subtle issue going on there.

Yes, Vue is only caching the returned function from `fooById`, however what happens next depens on whether or not `fooById` is used within a Computed Prop or somewhere else.

If it's used somewhere else that's not a Computed Prop, then indeed, no additional subscriptions are setup.  However, if it's used in another Computed Prop, then another difference in behavior arises: Whether or not the data that the Returned Function itself touches is Derived or Underlying.

I should take a moment to define terms here for the benefit of argument and reference:

- The _Computed Prop_ is as you would expect, the prop whose value is calculated upon access and cached by Vue.
    - There are two _Computed Props_ in the example below, `fooById` and `currentFoo`.
- The _Computor Function_ is the function which actually gets the value of the _Computed Prop_.
    - There are two _Computor Functions_ in the example below, one for `fooById`, and one for `currentFoo`.
- The _Template_ is of course the view that gets rendered for the Vue Component.
    - It can be thought of as a special-purpose _Computed Prop_ with its own HTML-like domain specific language, since reactivity subscriptions are handled the same way in the _Template_ as they are in _Computed Props_.
- The _Returned Function_ is the function which is returned by the _Computor Function_ as the value of the _Computed Prop_.
    - There is one _Returned Function_ in the example below, `findFooById`.
- _Underlying Data_ is any data that is directly stored in the Store State.
    - In the example below, we have `this.$store.state.someCollection` as _Underlying Data_.
- _Derived Data_ is any data which is created anew, based on the data in the Store State.
    - The example below does not actually have any _Derived Data_.

> TK: Second draft on this stuff.  It's all about what parts actually activate Vue's dependency access tracking, and why that can lead to cases of non-reactivity.
>
> I think the important points to illustrate are as follows:
>
> - For fully-derived data, why property access there doesn't create new subscriptions.
> - For returning functions, how not using it within another computed prop can cause a break in dependency tracking.
> - How these then conspire to break expectations, and how to work around them. (If you're doing computed prop stuff, stick to computed props.  Actually, that's just good advice generally.  Also, it may not be as efficient as you think, and you're usually better off just creating the derived data rather than trying to lazify it via a returned function.)
> - How, ultimately, this is all a result of this: Vue only does dependency tracking and subscription registration/deregistration during the _synchronous execution_ of any _Computor Function_.
>
> Lead in with these, maybe even just those exact bullet points, _then_ illustrate them.

The difference in behavior then arises from the fact that _Underlying Data_ is data that is _still part of Vue's reactivity tracking_, while any _Derived Data_ returned by a _Computed Prop_ is _no longer itself fully reactive_; rather only references to that _Computed Prop_ itself are reactive!

Let's take a look at an example that will work as expected:

```js
new Vue({
    data() {
        return {
            currentFooId: null,
        };
    },

    computed: {
        fooById() {
            // Vue now creates a subscription to `store.state.someCollection`.
            const coll = this.$store.state.someCollection;

            // This function is the value cached for `fooById`.
            return function findFooById(id) {
                return coll.find(e => e.id === id);
            };
        },
        currentFoo() {
            // The value of `currentFoo` updates if any one of
            // `fooById`, `coll`, `coll[currentFooId]`,
            // or `currentFooId` changes.
            if (this.currentFooId == null) return null;
            return this.fooById(this.currentFooId);
        },
    },

    template: `
        <div class="example-component">
            <!-- TODO: template! -->
        </div>
    `,
});
```

The above works because the value returned by `findFooById()` when it's called in the _Computor Function_ of `currentFoo` is _Underlying Data_, that is data directly from the Vuex State; it is not _Derived Data_.  And, since this _Underlying Data_ is accessed within that _Computor Function_, subscriptions are properly registered.

And further, since the value returned for `currentFoo` is _Underlying Data_, when the _Template_ references properties in that _Underlying Data_, properly-level subscriptions are properly registered.

> TK redo this part.

Given the above, then, we can get undesired behavior by changing two things, either which may themselves seem innocuous.

The first thing is to create _Derived Data_:

```js
new Vue({
    data() {
        return {
            currentFooId: null,
        };
    },

    computed: {
        fooById() {
            // Vue now creates a subscription to `store.state.someCollection`,
            // HOWEVER now accesses to coll[index] are NOT reactive!
            // coll and its elements here are now _Derived Data_, not _Underlying Data_.
            const coll = deepClone(this.$store.state.someCollection);

            // This function is the value cached for `fooById`.
            // Note that the function itself will be reactively updated...
            // But the underlying elements no longer cause reactive updates,
            // because there's nothing to register to!
            return function findFooById(id) {
                return coll.find(e => e.id === id);
            };
        },
        currentFoo() {
            // The value of `currentFoo` updates if any one of
            // `fooById`, `coll`, or `currentFooId` changes.
            // Updates to `coll[currentFooId]` however will
            // NOT cause reactive updates!
            if (this.currentFooId == null) return null;
            return this.fooById(this.currentFooId);
        },
    },
});
```

A ham-handed example, certainly, since data derivation is usually more complex than just deep cloning the underlying data, but the reasoning still stands: Any new objects you create are not themselves reactive, because they were themselves never part of Vue's reactivity tracking in the first place!  They were created anew in a _Computor Function_ and Vue doesn't reactify values returned by _Computor Functions_.

The second thing is to not use `findFooById` in another _Computor Function_:

```js
new Vue({
    data() {
        return {
            currentFooId: null,
        };
    },

    computed: {
        fooById() {
            // Vue now creates a subscription to `store.state.someCollection`,
            const coll = this.$store.state.someCollection

            // This function is the value cached for `fooById`.
            return function findFooById(id) {
                return coll.find(e => e.id === id);
            };
        },
    },

    methods: {
        getCurrentFoo() {
            // getCurrentFoo is a method instead of a comupted prop.
            // Only Computed Props register subscriptions!
            // Methods do not!
            if (this.currentFooId == null) return null;
            return this.fooById(this.currentFooId);
        },
    },
});
```

In the above example, only updates to `this.$store.state.someCollection` itself will actually cause a reactive update; updates that only mutate _parts of elements within `this.$store.state.someCollection`_ do not cause reactive updates!


### The Two Actual Issues

We can distill the above winging into 2 main points:

1. Calling a Returned Function does not create a Subscription.
2. The Returned Function's return value is not cached.



## Solutions: The Subscriptions Issue

Unfortunately, there's no real way to fully handle this part using functions.  Instead, you should precompute all your solutions: Theoretically, any where that actually needs such things will, itself, also have the parameters for finding the things.

I think this circles back to my point in React-Redux setups about only deriving data as close to the point of use as possible.  Seems to apply here, too...  The key to reuse, then, is to just separate out the derivation function and call it where ever.  Best of all, it's a plain function, and thus easy to test, etc.  Functions are great!



## Solutions: The Caching Issue

If your problem isn't really with the subscription, just with the cached value, then there's already plenty of machinery to deal with that.

- Simple Memoization
- Re-Reselect
- Various other cached-function mechanisms

In the case of Re-Reselect, Instead of using the whole state, you'd use something that contains whatever base data you needed extracted from the state, since you still want Vue to know what parts of the State you're subscribed to, broadly speaking.
