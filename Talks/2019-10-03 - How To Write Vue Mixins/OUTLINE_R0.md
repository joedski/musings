Outline r0
========

## How To Write Vue Mixins

### That Don't Make You Hate Everything

Featuring `vue-class-components`, `vue-property-decorator`, and Typescript.


### ~~Use Composition API, Instead~~

Or, whoops, that's not stable yet.

:(


### Don't, If Possible

- Try just making small utility classes or functions that achieve the intended functionality when used together at a component.
    - Composition over Extension.
    - Create them either at instantiation time or in a lifecycle hook.
    - Do any clean up if necessary.
- For some things, maybe even just using a Component with a Scoped Default Slot will do: `<foo-bar :prop="some.value" v-slot="{ foo, bar }">...</foo-bar>`.
- If you need shared state and don't want to involve a bunch of prop/event wiring, consider a Vuex module over a mixin.


### If You Have To, Then Make a Controller

Sometimes a combination gets repeated so often that you want everything together.  In such a case, try to keep the interface extensions and new components to a minimum, and make it obvious where things came from.

- Make a Controller that exposes all the mixin's functionality.
- Use the Mixin itself only to bind that Controller to the Component.
    - Props, Lifecycle, etc.
    - Data/State is handled by the Controller itself.
- Keep everything similarly named:
    - Mixin named `FooMixin`
    - Controller named `this.$foo`
    - Components whose names start with `foo`, such as `<foo-container>`, etc.


### Step 1: Make A Controller

- Your Controller can be a class, or instantiated using a factory, or whatever.  Pick your favorite way of binding params to operations (and state) and go with it.
- If you do need State in your Controller, create a Vue Observable.  This allows state updates to drive other reactive updates, namely template updates.
    - `this.state = Vue.observable({ stateValue: 'initial value' })`
- If you need lots of Derived Props and Watches, maybe just create a non-rendering Vue Component.  That's basically what Vuex is.


### Step 2: Make A Mixin

All of your actual implementation is in a Controller, so this is just binding.

- Gets config and props from the instance.
- Call Life Cycle Hooks at the appropriate times.
- Should be as boring as possible.


### Other Tips

- Most of this advice is not specific to Typescript projects, and is arguably more important in non-Typescript projects where you can't get as much help from tooling.
- Mixins by definition extend the interface of your component.
    - The less obvious the sources of things, the more of a headache it is later.
    - By exposing all your mixin's functionality through a single controller you give devs using the mixin a clear indication where the added functionality is coming from.
    - Same for naming any added components similarly to the mixin.
- Add as few Props as possible with a Mixin.
    - Again: extend the component's interface as little as possible.  If you have to, make it explicit where it's coming from.
    - More extensions means more cognitive burden.
    - Some options to mitigate:
        - Consider have the Component using the Mixin tell the Mixin what Prop to use via configuration.
        - Consider prefixing mixin-specific prop names with the mixin's own name.
- If you need exact typing based on config in Typescript for your Controller, use a Parametric Mixin.
    - `class Foo extends Mixins(FancyMixin({ ... })) { ... }`


### Example: Controller with Reactive State, Getters

```typescript
class CounterController {
    public get count(): number {
        return this.state.count;
    }

    public increment(): void {
        this.state.count += 1;
    }

    public decrement(): void {
        this.state.count -= 1;
    }

    protected state = Vue.observable({
        count: 0,
    });
}
```

- The protected property `state` is a Vue Observable, created during construction.
- The getter `count` is not itself reactive, but it references a reactive value.  Thus, if used in a Computed Prop or in a Template, it will register a reactive dependency.


### Example: Controller with Reactive State, Cached Getters, Watches


### Example: Parametric Mixins for Better Controller Typing


### There Will Be A Better Way

... at least for logic and lifecycle hook integration.

- You're going to learn about that next.
