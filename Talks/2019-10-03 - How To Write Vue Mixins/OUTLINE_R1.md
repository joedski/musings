Outline r1
========


## How To Write Vue Mixins

### That Don't Make You Hate Everything

Featuring `vue-class-components`, `vue-property-decorator`, and Typescript.


### ~~Use Composition API, Instead~~

Or, whoops, that's not stable yet.

:(

---

As of 2019-10-04, anyway.


### Don't, If Possible

Prefer Composition:

- Utility Classes and Functions
    - Small utility classes and functions that can be brought together to acheive various ends tend to be more maintainable and less magical.
    - They're also more explicit, in that you initialize them in the component they're being used, rather than in a Mixin Definition.
- Components configured via Props, and which have a Scoped Default Slot
    - You can use Scoped Default Slots to allow interaction with a component's inner state without having to do anything yourself.  Also remember that you can pass functions as Scoped Slot Props.
- A Vuex Module
    - This can be a useful way to do things, especially if you need shared state.
    - More work than a Utility Class.

#### Example: Components With Scoped Default Slots

```html
<my-counter :increment-by="2" v-slot="{ count, increment }">
    <div>Count: {{ count }}</div>
    <div>
        <button @click="increment">Increment</button>
    </div>
</my-counter>
```


### If You Do Have To: Namespace and Encapsulate

- Sometimes, you just gotta.  In that case, Namespace and Encapsulate.
    - Sometimes a combination gets repeated so often that you do want everything together.  This is especially the case for handling hook setup.  In such a case, try to keep the interface extensions and new components to a minimum, and make it obvious where things came from.
    - Benefits:
        - Namespacing keeps the source of things obvious, which makes it much easier on the next person coming through.
            - ~~Optimizing for less keyboard time is wrong: you spend far more time reading code than writing it.  Making it obvious where things come from means you can shift things in and out of conscious consideration more, which means you can more fluidly move through the codebase.~~ _(move this)_

- Encapsulate all Mixin Behavior in a Controller.
    - You can make this with a class, factory function, whatever.  Exact method is irrelevant, just do it.
    - This Controller will accept the Vue Component Instance for binding purposes.
    - Benefits:
        - By first writing the Controller outside of any Component or Mixin, you make it easy and obvious to place the Controller on a single instance property.
            - This effectively namespaces any state and behaviors behind that property name.
        - Does not pollute/overstuff the interface of the Component using the Mixin.
            - Lower cognitive burden: things are already organized, which (I've found, anyway) makes it easier to mentally organize.
        - A separate controller can be easier to test, though the benefit vs testing the whole mixin is marginal since you still need to pass a Component Instance in.
            - Unit testing Vue Components, and therefore Mixins, is always going to be pretty annoying regardless of how you slice it.  A separate controller helps you organize things, though.
            - On top of that, some of the things you might need to test are Reactivity type things, which require playing ball with Vue anyway.

- Write the Mixin Definition Separately.
    - Handles defining Props.
        - Note: Not Data!  Data lives in the Controller only!
        - Also, see later for specific notes on Props (and Events!)
    - Handles instantiating the Controller.
    - Handles actually calling Controller's own Lifecycle Hooks in the appropriate Component Lifecycle Hooks.
    - Handles Provide/Inject if that's something you need.
    - Handles type derivation if you have Mixin-Config-driven exact types.
    - Ideally, this part is very boring.

- Prefix Component Names with Mixin Name.
    - Again, make it obvious that any added components are added by the Mixin.
    - Example:
        - `WizardMixin` might add `<wizard-container>`, `<wizard-content>`, etc.
    - Benefit: Reiterate: It's obvious where things are coming from.

- Prefix Mixin-Specific Props and Events with the Mixin Name.
    - Adding Props with a Mixin is the absolute worst.  Prefix these with the Mixin's Name, too.
        - 
    - Example:
        - `WizardMixin` might have a prop `wizard:show` (yes you can use colons in prop names) and might `$emit('wizard:success')`.
    - Benefit: Reiterate: It's obvious where things are coming from.

---

(looks like this will have to be a few slides.  Alrighty.)

I think that the note about "Optimizing for less keyboard time is wrong" is probably better suited to a Caveats or Other Points section.  Or else better suited for a question.


### Tips When Making a Controller

- If you need reactive state in your Controller, you can create that using `Vue.observable(...)`.
    - Use getters for derived state.
        - While plain JS getters don't cache their values, you can still use them in non-intensive cases: If the Component that uses the Mixin and Controller references those getters that derive from your reactive state, those getters will still cache while also still registering reactivity dependencies with Vue.
    - Use methods to mutate basic state.
- If you need a lot of cached derived data, you can just create a renderless Vue Component with `Vue.extend({ ... })` or `@Component class Foo extends Vue { ... }`.
    - This is what Vuex does.
    - This is useful for more expensive computed values, such as filter results or slices of large collections.


### Example: Controller with Reactive State

```typescript
import { Vue } from 'vue-property-decorator';
import MultistepMixin from './MultistepMixin';

export default class MultistepController {
  constructor(
    protected vm: MultistepMixin
  ) {}

  public get startStep(): number {
    if (Number.isFinite(this.vm.multistepStartStep)) {
      return this.vm.multistepStartStep;
    }

    return 1;
  }

  public nextStep(): void {
    this.state.step += 1;
  }

  protected state = Vue.observable({
    step: this.startStep,
  });
}
```

---

Open `Example - Controller With Reactive State` in VSCode.


### Example: Vue Component Controller

```typescript
import { Vue, Component } from 'vue-property-decorator';

@Component({})
export default class TimeseriesController extends Vue {
  // ...
}
```


### Recapitulation: Namespace!

- Encapsulate behavior and state into Controller.
- NAMESPACE ALL THE THINGS: Controller instance, Props, Events, Components
- Make things easy for the next person, including Future You!


### That's All!

... or _is it_!


### There's Something Better than Controllers...

... which you'll learn about next!
