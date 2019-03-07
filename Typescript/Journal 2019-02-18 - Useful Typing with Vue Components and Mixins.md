Useful Typing with Vue Components and Mixins
============================================

One of the greatest difficulties in working with Typescript is in typing orthogonal extensions to component behavior in view libraries.  Properly typing a HOC in React is a real headache, and making such a HOC configurable only makes things worse.  Vue presents an even more interesting challenge given that Mixins are basically an imperative mode of extension as compared to the compositional mode of HOCs.  This simplifies the mental model somewhat since every Mixin's additions will operate in the same context (the same Component Instance) as every other Mixin, but makes static typing more difficult since Mixins are essentially all ad-hoc additions: the only way you know what they do is to apply and execute them in the Vue runtime.

1. Vue Forum Thread: Using Mixins with TypeScript: https://forum.vuejs.org/t/using-mixins-with-typescript/24256/8
    1. One method: Create Vue Classes through `Vue.extend(def)` and use a special `mixins()` helper to combine those Classes into a single Class and extend from that: https://github.com/ktsn/vue-typed-mixins
        1. Parametrization would occur via parametrizing the mixin itself, or through normal component options, I guess.
            1. The former like: `mixins(Foo(parametrization), Bar(otherParams)).extend({...})`
        2. Whole code base will change.  Also not a decorator form when you're already using those, so probably not appropriate to some codebases.
        3. Also, can't really think of how component options would still be able to affect typing.
    2. Another method: Use a Class that extends the Vue base and decorate it `@Mixin`: https://www.npmjs.com/package/vue-mixin-decorator
        1. Multiple Mixins are used by declaring an Interface that extends those multiple Mixins.
        2. This requires externalizing the Mixin Config from the Component Class itself so that you can parametrize the Mixin Interface with it.
        3. This does more closely align with one project I'm working on, anyway, since it [`vue-property-decorator`](https://github.com/kaorun343/vue-property-decorator).  Still, the gymnastics around using multiple mixins makes it mildly maddening.
            1. I'd almost prefer just using a `@Mixin` decorator that applies a single mixin to a class and just layering on decorators.
2. Apparently [`vue-class-component`](https://github.com/vuejs/vue-class-component) has [its own support for Mixins](https://github.com/vuejs/vue-class-component#using-mixins).
    1. In contrast to [(Ss 1.2.2)](https://www.npmjs.com/package/vue-mixin-decorator).
    2. Also apparently [`vue-class-component` is officially supported](https://vuejs.org/v2/guide/typescript.html#Class-Style-Vue-Components).
3. Vuex and Typescript: https://forum.vuejs.org/t/vuex-typescript-and-vue-cli-strongly-typed-store/39925/2
    1. Basically, say `export default abstract class Vue extends BaseVue { public $store: Store<AppState>; }` and extend from that Vue class instead.
    2. Same thing can be done with any other global additions like event busses, HTTP services, etc.
    3. I wonder if this can also be done using [declaration merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)?
        1. Answer: NOPE.  From that page: "Not all merges are allowed in TypeScript. Currently, _classes can not merge with other classes_ or with variables."
        2. Thus, point 3 about creating an extension.
        3. This is also why `vue-class-component` uses the `mixins()` utility function to create a merged Base Class that the Component using those Mixins extends from.
