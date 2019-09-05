Journal 2019-09-03 - vue-property-decorator - Writing Custom Property Decorators
========

In one of the projects we're using `vue-property-decorator` which I have mixed feelings about.  I ran into an interfacing issue with some Mixins I was writing: Since I couldn't group things into a special Component Config Section, how do I explicitly indicate that something is being used as part of this Mixin's functionality?



## The Story

The concrete example went like this:

- There's a parent component, which uses `WizardStepperMixin`, which gives a stepped wizard type UX.  It's basically some app-specific behaviors around Vuetify's `VStepper`.
- There's the Step children, which use `WizardStepMixin`, which provides some automatic behavior when used as Steps of a `WizardStepperMixin` component's `VStepper`.
- The Stepper Parent controls the Stepper Navigation.
- The Stepper Children need to be able to block navigation for things like asynchronous validation of a form field.


### On Mixins Generally

Now, I don't hate Mixins, but I don't love them either.  To work around the issues that I ~~hate~~ don't love about Mixins, I follow the following strategeristic followables:

- Any methods, data, and computed props added by the Mixin are interacted using a `$`-prefixed controller/delegate (henceforth just called a "controller") with the same name as the mixin itself, sans the `Mixin` at the end and camelCased rather than PascalCased.
    - So, `WizardStepperMixin` provides a controller accesed at `this.$wizardStepper`, etc.
    - This imitates other `$`-prefixed things.  Think of it as a service that's local to the component itself.
- Any parametrization of the Mixin goes into an appropriately named property on the Component Options Object.
    - So, `WizardStepperMixin` would have any config, if any, put into the `wizardStepper` property of the Component Options Object, in much the same way that `watch` or `computed` have their sections.
    - And, for instance, the `WizardStepMixin` might say something like `wizardStep: { isBusyWatch: 'someComputedPropForIsBusy' }`.

That keeps everything symmetrical and explicit.



## The Rub

Now, all that's all well fine, but with vue-property-decorator, you don't have that because you're using Decorators on Classes and Class Members.  Compounding that.  Compounding that, if you're using Typescript then one of the reasons you use classes is for better type handling, and good luck trying to do that with both a config object and classes.

You could probably do it by passing the config to the Mixin itself, provided your Mixin is actually a Class Factory instead of a Class, which is a pattern I like under certain circumstances.  That creates a new class each use, but eh.

That also avoids one of the schticks of Decorators: Specifying behavior at the point of use, rather than at the config level.  So, why not use Decorators, then?

... because I have to learn new things.  But also, I get to learn new things!



## How I Decorator For Fish

So, first off, a caveat: As of 2019-09-03, most transpilers (Babel, tsc) still use Stage 1 Decorators, so everything written here is based on the [legacy decorators stuff](https://github.com/wycats/javascript-decorators/blob/master/README.md).  You have been warned.  (That said, updating shouldn't be too hard, it's just the accidents that change, not the concepts.)

So, vue-property-decorator is itself more or less an extension of [vue-class-component](https://github.com/vuejs/vue-class-component) that provides common utilities for, well, common parts of declaring components: Props, ... Props.  There's other things, too, like using Provide/Inject in a somewhat more type-safe manner, but yeah.  It's mostly so you can continue leveraging classes in Typescript in a way that doesn't require jumping through all sorts of type derivation hell.

Anyway.  vue-class-component provides some utilities easing the creation of new decorators that can be used on, say, Props!

In fact, let's take a look at how vue-property-decorators does that now:

```typescript
/**
 * decorator of a prop
 * @param  options the options for the prop
 * @return PropertyDecorator | void
 */
export function Prop(options: PropOptions | Constructor[] | Constructor = {}) {
  return (target: Vue, key: string) => {
    applyMetadata(options, target, key)
    createDecorator((componentOptions, k) => {
      ;(componentOptions.props || ((componentOptions.props = {}) as any))[
        k
      ] = options
    })(target, key)
  }
}
```

> Note, for now we're ignoring `applyMetadata`, but it's definitely [worth a look](https://github.com/kaorun343/vue-property-decorator/blob/56d8db46728359de5014c9cdbe6bf38019fd416f/src/vue-property-decorator.ts#L117) to see what all's happening.

The main part there is the [`createDecorator`](https://github.com/vuejs/vue-class-component#create-custom-decorators) call:

- It receives the Component Options Object as its first argument, and the Key of the Decorated Class Member as the second. (It also receives the argument index as the third param if decorating a function argument, but that's not used here)
- From there, you can mutate the Component Options Object as necessary to bring it into alignment with the decorated description of the class.

And in this case, the mutation is to set the options for the given prop. (after ensuring the `props` option section exists)

Easy!


### As Applies To My Use Case Story

So, I want to be able to declare a Class Member (A computed prop, say) as being for the `isBusy` watch or whatever of `WizardStepMixin`.  Easy:

> TK: Code!

```typescript
export const IsBusyGetter = createDecorator((componentOptions, memberKey) => {
    componentOptions.wizardStep = componentOptions.wizardStep || {};
    componentOptions.wizardStep.isBusyGetter = memberKey;
});
```

Then the mixin itself could add some code in the `created` hook to watch whatever's in `isBusyGetter`:

```typescript
export WizardStepMixin extends Vue {
    private created() {
        if (this.$options.wizardStep.isBusyGetter) {
            this.$watch(isBusyGetter, (next) => {
                this.$wizardStep.isBusy = next;
            });
        }
    }
}
```

And so on for anything else that needs immediate setup.

Things like `BeforeNextHook` will have the same thing done in the decorator, but the implementation will be different:

```typescript
export WizardStepMixin extends Vue {
    @Inject()
    protected get $wizardStep() {
        const $this = this;

        return {
            next() {
                const { beforeNextStep } = this.$options.wizardStep;
                if (beforeNextStep && typeof this[beforeNextStep] === 'function') {
                    this[beforeNextStep]();
                }

                this.$emit('next-step');
            },
        }
    }
}
```

Some tsignore or any-casting may have to be done.  Bleh.



## Other Thoughts

So, basically, using Decorators on Class Members is the same as specifying Options in Component Options Objects, at least where such options don't extend the component's interface.  Woo.

It's an annoying limitation, of course, that we still can't use Decorators to extend the object interface itself.  That's probably a good thing generally, but at least for Mixins it means you can't do exact-typing derived from Decorated Members, which means to be type safe you either need to parametrize the Mixin itself (Mixin Factory pattern) or duplicate logic (Delegate-Interface pattern?  Delegate-Factory pattern?  what would that even be called?).  Parametrizing the Mixin itself seems the less annoying approach, but of course it Looks Weird.
