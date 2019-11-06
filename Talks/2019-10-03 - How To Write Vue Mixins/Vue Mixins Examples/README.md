Vue Mixins Examples
========

Illustrating various ways to write a mixin.

> NOTE: These examples are illustrative only, not necessarily how you'd implement the described features.

> NOTE: Example code is all in Typescript.  All this is doable in plain JS, though.  (except the type info, of course.)

- [Controller Class with Reactive State](./Example%20-%20Controller%20With%20Reactive%20State)
    - Use a plain JS Class with a Vue Observable as state.
    - Doable in Vanilla JS.
    - Getters are plain getters, no caching.
    - Reactivity is handled by the state being a Vue Observable, and getters accessing or deriving from that.
- [Controller as Renderless Vue Component, in Vanilla Vue](./Example%20-%20Controller%20as%20Renderless%20Vue%20Component%20%28Plain%20Vue%20Component%29)
    - Use a Vue Component created with `Vue.extend({ ... })`.
    - Doable in Vanilla JS.
    - Computed Props are cached as normal.
    - Watches are available, too.
    - Closest to feature-set available with Composition API, but doable now.  Hopefully officially obsolete soon?
- [Controller as Renderless vue Component, using `vue-class-component` and/or `vue-property-decorator`](./Example%20-%20Controller%20As%20Renderless%20Vue%20Component)
    - Use a Vue Component created with `@Component class MyController extends Vue { ... }`.
    - Uses `vue-class-component` and maybe `vue-property-decorator`.
    - Uses Stage 1 Decorators, so caveat emptor.
    - Otherwise same features as Renderless Vue Component in Vanilla Vue.
