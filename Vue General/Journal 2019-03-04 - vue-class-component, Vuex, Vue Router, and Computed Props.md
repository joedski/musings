Journal 2019-03-04 - vue-class-component, Vuex, Vue Router, and Computed Props
==============================================================================

It seems `vue-class-component`'s baseline behavior around reactivity, Vuex, and Vue Router leaves something to be desired.

There are a few suggestions:

1. [Declare such computed props in the Component Options](https://github.com/vuejs/vue-class-component/issues/109)
2. [Declare such computed props with a custom Decorator](https://github.com/vuejs/vue-class-component/issues/56)
3. [Use some decorators maintained by the suggester of 1 and 2](https://github.com/ktsn/vuex-class)

3 looks promising, but doesn't cover the Vue Router case.  Guess I'll just need to follow their lead and make one for that.



## Typescript Typing?

1. [Request: Class Decorator Mutation](https://github.com/Microsoft/TypeScript/issues/4881)
    1. Lengthy thread discussing and bikeshedding the ability to alter a Class's type signature with the Decorators applied to it and its members.
    2. Spoiler alert 2019-02-07: Not possible yet.

Since those are all Property Member declarations and decorations thereof, I'm not sure how to do any sort of type enforcement.  I'm not sure if it's even possible, yet.  Given 1, I'm pretty sure it's not.  So much for type safety.

Seems basically you can do this:

1. Declare computed props in the `@Component` options, as per Suggestion 1 at the top.
    - Pros:
    - Cons:
        1. Does not allow typechecking.
2. Declare computed props with Property Decorators as per Suggestions 2 and 3 at the top.
    - Cons:
        1. Does not typecheck against access method.
3. Don't use `vue-class-component` or anything derived from it like `vue-property-decorator`.
    - Pros:
        1. Discard class-based interface, which feels pretty superfluous anyway.
    - Cons:
        1. Lose class-baed interface, which TS has some niceties for.
            - Though, I'm not sure how much that actually gets used.
        2. Requires different tooling.  Maybe builder helpers?

How would 3 work?  Maybe imperative helpers that are "static" due to being called at the module level.

```js
export default component('ExampleComponent')
.props({
    target: {
        type: String,
    },
})
.computed({
    greeting() {
        return `Hello, ${this.target}!`;
    },
    storeProp() {
        return this.$store.getters.someGetter;
    },
});
```

And so on.  The major downside I see is that computed props that depend on methods need to have those methods declared before hand.  Annoying, but there you go?  Some typing funtimes may have to be employed for methods that trampoline.
