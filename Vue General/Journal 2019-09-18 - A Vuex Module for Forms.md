Journal 2019-09-18 - A Vuex Module for Forms
========

There doesn't seem to be a lot in the way of Vuex-centric form handling in the Vue world, so I'm going to make a minimal one for a project I'm on.  Who knows, maybe it'll grow into something more general?

I'm probably going to reference Redux Form here and there as that's the last central store based form state manager I've had any real experience with, and it seems fairly comprehensive.

Since I'm not trying to create a generalized module yet, I can make a few assumptions and omit a number of features.  One key assumption is the presence of a [Requests Module](./Journal%202019-05-24%20-%20Keyed%20Requests%2C%20Options%2C%20and%20Other%20Things%20Derived%20Therefrom.md), which makes requests via config objects and exposes the state via AsyncData.  This makes deriving state extremely simple and reactive.



## Scope of Work r0

First, there's the scope of work itself.

Parts that I do want to handle are:

- Form State:
    - Manually-Managed:
        - Is Busy (Do we even need this?)
    - Derived:
        - Is Any Field Validating (Async)
        - Is Any Field Busy
        - Is Any Field Invalid
- Form Field State:
    - Manually-Managed:
        - Value (though usually you'll just bind/sync this to some form field input)
        - Is Busy
        - Manual Error Messages
        - Rules (technically.  It's set during initialization, though.)
    - Derived:
        - Is Async Validating
        - Error Messages (combined from other two)
        - Is Invalid ((Combined) Error Messages Count > 0)
        - Rule Error Messages (Sync + Async)

Although Submit handling and form-wide validation are common operations, I'm not sure it's actually required to manage the state itself.  I'll avoid those because, honestly, it's more likely than not that you'll need to map the form state before submission, anyway, and async form-level validation can be handled at the same time as submission.  Sometimes the only way you can handle it is by submitting, so, eh.

> Since the entire point of this is to be able to easily reference the same form in multiple places, how do we share "is submitting" state across multiple places?  The current answer is kinda two things:
>
> For one, I'm using a Requests Module which means anyone who knows the request config can also derive state based on that Request.
>
> For another, in my current setup, even though multiple places need to know the form field state, _only one actually needs to know the form submission state_.

Though I referenced Redux Form, there's a lot in there that's not included here, notably things like touched, dirty/clean, pristine, etc, as well as the aforementioned submit handling.  The current project I'm working on is using Vuetify, so I'm having that manage those somewhat more presentational aspects.  We'll see if that pans out in the end.


### Configuration r0

To drive this, then, I'll need some config.  I already did some sketching elsewhere and came up with this as something I think will work to configure the above state:

```typescript
interface FormConfig<TFields extends AnyFormFields> {
    key: string | symbol;
    fields: TFields;
}

type AnyFormFields = {
    [fieldName: string]: FormFieldConfig<any>;
}

interface FormFieldConfig<T> {
    initial: (T extends object ? () => T : T) | null;
    rules: FormFieldValidator<T>[];
}

// RequestConfig<T> comes from the Requests Module.
// null covers initial cases.
type FormFieldValidator<T> = (v: T | null) => boolean | string | AsyncValidation<any>;

interface AsyncValidation<TData> {
    validationType: 'request';
    request: RequestConfig<TData>;
    map(data: AsyncData<TData, Error>): boolean | string;
}
```

Some thoughts:

- We're not handling back-and-forth translation like Redux Form does.  I really don't want to bother with that, but maybe it's something we'll need?
    - There is at least one case where we split an input into multiple items if it's got any delimiter-like characters, so there's that much.
    - I might just leave the translation to the point of use for now since it's only happening once.  We'll see how things go there.
- We're also not specifying submit handling because that's easy to do at the point of use.
    - Maybe after an initial trial, I'll find that this is better specified in the config, but for now I'm not bothering.
    - However, I can think of one place where it will help: Submitting state.
        - Initial thought there: `dispatchSubmitForm(store, { form, submit: () => this.submit() })`.  That would handle any "is submitting" state while at the same time keeping submit functions out of the config.  Come to think of it, that's basically what Redux Form does, anyway, so there you go.

#### AsyncValidation: Map AsyncData or just Data?

As initially drafted, I specified the mapper to be `map(data: AsyncData<TData, Error>): boolean | string`, but I'm wondering now if that's the right way to go?

I guess it's the most agnostic: It doesn't care if the remote service signals invalidation by HTTP error or a specially formatted payload, though the latter is more correct I think.  I guess I'll just leave it as that for now.  Bleh.


### State r0

This will basically be an implementation of the outline stated at the beginning of this section, with a note that field states are obligate children of form states and thus that form states do not share field states.

```typescript
interface FormModuleState {
    forms: Record<string | symbol, FormState<AnyFormFields>>;
}

interface FormState<TFields> {
    isBusy: boolean;
    isSubmitting: boolean;
    fields: {
        [K in keyof TFields]: FormFieldState<TFields[K]>;
    };
}

interface FormFieldState<TFieldConfig> {
    value: TFieldConfig extends FormFieldConfig<infer T> ? T : any;
    isBusy: boolean;
    manualErrorMessages: string[];
    rules: TFieldConfig extends FormFieldConfig<any>
        ? TFieldConfig['rules']
        : Array<FormFieldValidator<any>>;
}

interface DerivedFormState {
    readonly isAnyFieldBusy: boolean;
    readonly isAnyFieldValidating: boolean;
    readonly isAnyFieldInvalid: boolean;
}

interface DerivedFormFieldState {
    readonly isValidating: boolean;
    readonly isInvalid: boolean;
    readonly rulesErrorMessages: string[];
    readonly errorMessages: string[];
}
```


### Accessors r0

- Actions:
    - Initialize Form (Form)
    - Destroy Form (Form)
    - Update Form Is Busy (Form, Is Busy)
    - Submit (Form, Submit Handler)
    - Update Field Value (Form, Field Name, Value)
    - Update Field Is Busy (Form, Field Name, Is Busy)
    - Update Field Manual Error Messages (Form, Field Name, Error Messages)
- Mutations:
    - Initialize Form (Form)
    - Destroy Form (Form)
    - Update Form State (Form, (Is Busy, Is Submitting))
    - Update Field State (Form, Field Name, (Value, Is Busy, Manual Error Messages))
        - Rules are only ever mutated during initialization, and should not change afterwards.
- Reads:
    - Form State (Form): (Non-Field Form State, Derived Form State)
    - Field State (Form, Form Field): (Field State, Derived Form Field State)
        - NOTE: Just for convenience, I'll probably implement the Value field as a reactive property, a get/set pair, because manually wiring all that up is ~~bullsh~~ annoying.

The best part is, because Async Validations are implemented in terms of AsyncData and a separate Requests Module, I don't even have to track that state here.  Hah hah, I love derived data.

As a general note: I ultimately decided to define a reader function for each property, on the basis that it can handle default-value return better like that.  Also it's a lot easier than preemptively combining them all into some sorta class thingermadoo.


### Error: Type 'TFieldKey' cannot be used to index type...

So I was writing my accessors, readers specifically, like this:

```typescript
export function readFieldRulesResults<
  TFormConfig extends FormConfig<AnyFormFields>,
  TFieldKey extends keyof TFormConfig['fields']
>(
  storeLike: FormsModuleStoreLike,
  params: {
    form: TFormConfig;
    field: TFieldKey;
  }
): FormFieldValidatorResult[] {
  const fieldConfig = params.form.fields[params.field];
  // ...
}
```

but was getting an error `Type 'TFieldKey' cannot be used to index type 'Record<string, FormFieldConfig<any>>'.ts(2536)` on that first line there, trying to access `params.form.fields[params.field]`.  I thought those constraints would be enough, but obviously I was wrong.

Constraining the TFields type param of `FormConfig<TFields>` seems to work, though:

```typescript
export function readFieldRulesResults<
  TFields extends AnyFormFields,
  TFieldKey extends keyof FormConfig<TFields>['fields']
>(
  storeLike: FormsModuleStoreLike,
  params: {
    form: FormConfig<TFields>;
    field: TFieldKey;
  }
): FormFieldValidatorResult[] {
  const fieldConfig = params.form.fields[params.field];
  // ...
}
```

I guess it wasn't constrained enough, before.  Good to know.


### Initial Values

I should define what the initial values for anything should be, since obviously before a form is initialized there's nothing really to read.

This is representative of what the initial values should be, but not how it'll actually be dealt with.

```js
const initialFormState = formConfig => ({
    config: formConfig,
    state: {
        isBusy: false,
        isSubmitting: false,
    },
    fields: mapValues(formConfig, initialFieldState),
});

const initialFieldState = fieldConfig => ({
    value: typeof fieldConfig.initial === 'function'
        ? fieldConfig.initial()
        : fieldConfig.initial,
    isBusy: false,
    manualErrorMessages: [],
});
```

Derived state can then be derived from those.  I guess `rulesErrorMessages` then should be created based on the initial value rather than just an empty array.  I'll do that, then.


### Async Validation Rules

I think that this sort of thing is likely to remain noisy, since we're probably gonna be dealing with different requests.  Here's the test one:

```typescript
const testRequestFactory = createRequestConfigFactory({
  baseURL: 'http://127.0.0.1/test',
});

export default interface IValidationResponse {
  messages: Array<{ text: string }>;
  status: 'PASS' | 'FAIL';
}

const postValidateName = (params: { body: { name: string } }) =>
  testRequestFactory.post('/validation/name', {
    data: params.body,
    validate: (v: unknown) => assumeType<IValidationResponse>(v),
  });

const namePassesValidation = rules.passesValidationRequest(
  (v: string) => postValidateName({ body: { name: v } }),
  (data: AsyncData<IValidationResponse, Error>) => {
    if (data.tag === 'Error') {
      return data
        .mapError(error => `Error while validating: ${error.message}`)
        .getErrorOr('Unknown error while validating');
    }

    return data
      .map(d =>
        d.status === 'PASS'
          ? true
          : d.messages.map(m => m.text).join('; ')
      )
      .getDataOr(true);
  }
);
```

Of course, if everything returns something that looks like IValidationResponse there, then we could just extract that into a common function.


### Form State: Is Submitting: Maybe AsyncData Instead?

This seems like another natural place for AsyncData to be used: Form Submission is an async process, and anywhere where we have an async process, we can represent the current state as AsyncData.

This would actually make it more uniform, since Fields use AsyncData via the Requests Module to determine if they're currently validating or not.



## Debouncing Async Validation

While async validation is usually pretty quick, it's better to wait for a hot second before actually sending out a validation request as it reduces server load by quite a bit.

How to implement it without local validation wrappers?  Something in Requests? (please no)  Create local validation wrappers in the store? (... maybe)  Hm.

Given that AsyncValidation already has special handling, maybe I'll just add a `debounce` parameter to it.  Heh.  Then, creating the actually-debounced functions can just be another part of initialization.  All they have to do is debounce dispatching the validate request action.


### Another Module?

I suppose if I wanted to get _fancy_ I could create a Debounce Module.  While an initial implementation could be rather simple, I imagine it'd be more comprehensive to just port [lodash's debounce](https://github.com/lodash/lodash/blob/master/debounce.js) to a Vuex module.  Heck, all the state and options-reification is declared right at the top.  I guess the question is, is it really worth pulling out the code versus just using it as a debounce-dispatch-manager?

Since Vue's imperative, there's no reason you couldn't actually create the debounce before hand and just invoke it later, which is what would happen in this case of Async Validation.  Of course, since a Vuex module would require keying such things, there's no reason it couldn't be created lazily...  Either way.



## Actions

So now that the mutations are written and tested, admittedly perhaps the tests are a bit overwrought, but it did raise a number of type issues that I've fixed, especially with the type parametrization around `TFieldKey`.

Now, though, on to the meat: The Actions.  Here we get to the fun things because we get to take into account things like Async Validation Debouncing and such, as well as defining behavior around what happens if you dispatch `initializeForm` multiple times on the same form.  Also only conditionally committing mutations, all that good actiony stuff.


### Actions: Initialize Form

The first meaty one, here we have to do the following:

- Conditionally commit `INITIALIZE_FORM`.
- Reset field values?
- ... Dunno.  That might be it.

I think Debounce Initialization will be best handled lazily so that I don't have to evaluate the rules immediately.  Rather, just do them on the next time the value changes.  Though, thinking about it, something will be evaluating those rules anyway, so ... eh.

In that case, maybe do it eagerly just to save some lazy logic later.

That still leaves the question of what multiple dispatches of `initializeForm` should do.  I'd rather not leave that undefined, but I can't think of what the most reasonable default would be:

- Do nothing?
- Reset field values?
  - UPDATE: Going with this, see below.

I'm leaning towards doing nothing and having a separate action reset field values: it's less ambiguous what happens, and makes multiple dispatches of `initializeForm` do nothing after the first one.  But what _is_ the expected behavior?  To put the form into a pristine state?  Does doing nothing violate expectations?

Since I compare things to Redux Form, what's that do on initialization?

- In the form config, they have an option `keepDirtyOnReinitialize: boolean` which defaults to false, meaning initialization by default resets the form.

Without peeking at the source, I can't really see more than that.  So given that, I'll go that way then: dispatching `initializeForm` multiple times resets the form state in the state each time.


### Aside: Managing Debounces

As noted, for now I'm literally just storing references to functions created with `lodash.debounce` because it's there and comprehensive.  The question is how to interact with that?

- I could create a separate controller, and just use that.
- I could create a Vuex module, and use that.
- I could just manage them on the Form state.
  - I could manage them as a separate module-state slice.
  - I could just store them as more each-form state, or even each-field state.

The Vuex module one sounds heavy, and I'm not certain it's entirely necessary.  Dunno.  I mean, either one will have to have defined operations, so and it's not like the debounces themselves are actually used for rendering, so regardless of how the state is stored there's no real difference on redraws.

The Form State option is sort of between the two: it's in Vuex, but not a separate module.  That might make it trivial to lift out, but if we do that, why not just make it one in the first place?  Hum.

One thing I think I'll avoid, though, is interleaving management of those with the fields themselves.  It's orthogonal, so not something that should be a part of the fields state.

There's just 3 different operations:

- Create Debounce (Id, Fn, Timeout, Options)
- Call Debounce (Id, Arguments)
- Destroy Debounce (Id)

> I wonder if destroy should guarantee that something won't be called?  Hm.  Not something I think I'll worry about for now, but something that should be considered.

For the current project, I decided to implement a minimal separate controller.  I defined the various specific behaviors based on what I needed right now, while still leaving most of it as open to parametrization as I could without going too far off course.  We'll see if it's correct or not, I guess, but it's basically what I would've written specifically for the Forms module just it allows you to pass in any function.

#### Gut Check: Does This Work for Components, Too?

What would it take to use the minimal controller on a Component?

- Create a Controller for the Component.
- Create Debounces for each Debounced Method.

Would that actually be useful?  Do we even care?  Honestly, on the Component level, I'd probably just create a Debounce Decorator that debounces the individual decorated method during component creation.  So, really I guess this question is irrelevant.

#### Slight Wrinkle: Async Validation Still Needs to Read As Pending Even Before Call

One slight issue I forgot about on first implementation: a Field needs to read as `isValidating === true` even before the debounced call is made.  Currently, however, there's no reactive way to do that.

I can think of a couple ways to do it:

- Make my Debounce Controller's state reactive, and add `isPending` to that.
  - Keeps things separable.  You can use Vue Components without actually rendering anything, only using Vue's reactivity system.  That's actually a first class thing in the Composition API.
- Preemptively set the given request's data to `AsyncData.Waiting`.
  - This can be done, but is actually the worst option.  It's not an exposed thing, and we shouldn't do it.  `AsyncData` may be generic, but the Requests module is not.
- Track the extra `isAnyAsyncValidationPending` state in Form Field State.
  - This seems like the smallest amount of work, and doesn't require changing the Debounce Controller.

Now, I say that that seems like the smallest amount of work, but is it?

Here's the thing: I'd like to keep all the gory details of the debounce stuff out of the Forms Module, if possible.  I suppose a question then is, is it really that difficult to reactify the Debounce Controller?

What all needs to be reactified?  Just its State.

Does anything outside it ever access its State directly?  No, its State is scoped Protected, as its State is meant to be an implementation detail.

Why not just do `state = new Vue({ data() { return { debounces: {} }; } })` and change the internal accesses to it?

I guess the only change, then, is that `isPending` needs to be explicitly documented as reactive.  That was easier than I thought.

#### On Async Validation: Just Have Something Watch?

> Actually, use a plugin system or something.  Hooks, rather than Watches.  Tricky part would be setting up types.  Lotta type params.  Bluh.

Theoretically, given that reactive things can Watch other reactive things, could async validation have been implemented using an entirely separate thing?  That is, could it have just been given the form state and watched for any updates matching `forms[string].fields[string].value`... though having some form of registration explicitly for field updates in the Forms module would make things considerably easier.



## Field Arrays

One thing I didn't yet handle is Field Arrays.  Another concept shamelessly lifted from Redux Form, this is just a field definition that used to define an array of the same field rather than a single field.

This means the following things:

- Rather than a single state for a given field definition, we now have multiple states for a given field definition.
- These states also have an order.
- There's also aggregations across all elements in the array, similar to how the form has aggregations across all fields.
    - On top of that, some of those aggregations of the field arrays will be used by the form for its own aggregations.
    - This requires that the Field Array have an interface that is sort of a superset of the plain Field.

As far as the interface goes, the changes are thus:

- Instead of just the field name, we now have the field name + element index.
- New array-centric operations for the field itself.
    - Push, unshift, pop, shift, move, swap, remove all, splice, etc.
        - All can be implemented in terms of splice, really, so they may end up being just convenience calls atop that.



## On a More Extensible Forms Module

Redux Form didn't handle validation on a per-field basis, you had to define that yourself.  There's a good reason for this, actually: The basic-most form is basically just a fancied up dictionary, a bunch of key-value pairs, specifically named in the case of field arrays, but KV Pairs none the less.

Validation itself is an entirely separate concern, and async validation another on top of that.

So, if all of these are separate concerns, how do you actually implement them in an extensible manner?  By making them all separate in the first place and composing them atop the base, of course.


### Composition Methodology 1: Separate Vuex Modules

The most blunt-force way to do this is to just literally compose it with separate modules, which isn't too bad a way to do it as it reflects the separation of concerns thing.  It does make acting on Form actions and mutations a bit more difficult, though.

The easiest way to do this I can think of is to just have a top-level Forms module that all the others are grouped under.  So basically:

```js
const formsCoreModule = {
  namespaced: false,
  // Core stuff: just the form state, field values, field arrays, etc.
};

const formsUxModule = {
  namespaced: false,
  // UX stuff: touched, dirty, etc.
};

const formsValidationModule = {
  namespaced: false,
  // Validation stuff.  yay.
};

// This module contains only the other modules, no actions or such itself.
const formsModule = {
  namespaced: true,
  modules: {
    core: formsCoreModule,
    ux: formsUxModule,
    validation: formsValidationModule,
  },
};
```

That keeps things namespaced at a global level, but locally they can all share actions, which is important: this is how other modules hook into the core actions and act upon them.

The main issue here is, the order is undefined, so things like validation can't reliably pick out changes to core state, which is just kind of important.

Okay, maybe the top level one needs to be setup to dispatch all the other in the correct order?  It's about the only way to be sure, really.  Annoying and boilerplaty.


### Composition Methodolgy 2: Something Something Middleware

"Middleware" is basically just fancy function composition, here.

```
type Middleware = next => (context, payload) => result;
```

So, yeah.  Define interceptors for each Action, I guess.  Or, that basically defines the overrides that would be found in the top-level `formsModule` composite in Methodology 1, so this might just be a better interface overtop that?  Hm.

Then again, that makes sense: Vuex, like Redux, is a low level tool, so you're going to have to get into the nitty gritty about just how things compose together anyway.  The added boilerplate is really all necessary code.
