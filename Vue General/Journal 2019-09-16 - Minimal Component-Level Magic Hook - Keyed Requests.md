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
