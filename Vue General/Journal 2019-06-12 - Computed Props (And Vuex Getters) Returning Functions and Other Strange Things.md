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
