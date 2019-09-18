Journal 2019-09-16 - Tracking Component-Made Requests - Keyed Requests
========

Suppose we'd like to track all requests made by components in our [Keyed Requests setup described earlier](./Journal%202019-05-24%20-%20Keyed%20Requests%2C%20Options%2C%20and%20Other%20Things%20Derived%20Therefrom.md).  How might we do that without adding extra hooks or mixin options?  Could we do it?

I think so, about as easily as one could implement Vue's dependency tracking behavior.  Which, I mean, isn't trivial, but at the same time, the idea itself is.

To wit, I think this should be adequate:

- Wrap access to `this.$store` so we can intercept calls to `this.$store.dispatch` and `this.$store.getters`.
    - We're using `typesafe-vuex`, and we know that only those two things are used in our case, though there's no reason access to other things couldn't be similarly indirected.  Granted, `this.$store.state` might be mildly trickier and certainly less performant.
- Add extra behavior around our specific actions and getters.
    - Since actions and getters are only accessed by name, we only need to indirect on our specific names.

Complications:

- We still need some component-side thing, since we need to indirect the behavior of `this.$store` access.  Vuex's plugin already adds it as a prop, so wrapping of that may be complicated.

Thinking about it, all we really need is `this.$store` to set `someGlobalState.componentAccessingStore = this` before actually returning `$store`, and ... something to unset it when it's done.  Hm.  Maybe not as clean as I thought, though still useful.



## The Other Option: Only Add Stuff, Don't Jimmy Others' Stuff

The safest option, which requires more work of course, is to just have our own helpers which add the above tracking functionality.  This means wrapping reads and dispatches on the component, maybe in a mixin or something.  It would also mean not trying to mess around with others' stuff, though, which is always a better option.

This of course wouldn't cover existing uses, but there you go.  It would however allow pre-binding of `this.$store` and the request config, which is a good thing.

Maybe something like...

```typescript
// using vue-class-component
@Component
export default class Foo extends Vue {
    get getThingyRequestor() {
        const requestConfig = (() => {
            if (this.thingyId) {
                return requests.getThing({ thingyId: this.thingyId });
            }
            return null;
        }());
        return createRequestorHelper(this, requestConfig);
    }

    get someDerivedValue() {
        // This sets deps on:
        // - this.getThingyRequestor
        // - store.state.requests[getThingyRequestKey].data
        this.getThingyRequestor.data
            .map(thingy => thingy.name)
            .getDataOr('nothing!')
            ;
    }

    mounted() {
        this.getThingyRequestor.dispatchIfNotNullAndCatch();
    }
}
```

Weird, because it requires passing `this`, rather than something more expected like `this.$store`, but there you go.

Or, it could be done on a data prop:

```typescript
// using vue-class-component
@Component
export default class Foo extends Vue {
    getThingyRequestor = createRequestorHelper(this, () => {
        if (this.thingyId) {
            return requests.getThing({ thingyId: this.thingyId });
        }
        return null;
    });

    get someDerivedValue() {
        // This sets deps on:
        // - this.getThingyRequestor
        // - store.state.requests[getThingyRequestKey].data
        this.getThingyRequestor.data
            .map(thingy => thingy.name)
            .getDataOr('nothing!')
            ;
    }

    mounted() {
        this.getThingyRequestor.dispatchIfNotNullAndCatch();
    }
}
```

In which case, it would setup a `watch`.  This is probably more performant?

To keep things not unperformant, it'd use either a class or `Object.create()`, one of those things to keep everything but the config prop on the prototype.

Of course, one could just do `new RequestorHelper(this, ...)` then.  So, eh.
