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
  TFormConfig extends FormConfig<TFields>,
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

Given that AsyncValidation already has special handling, maybe I'll just add a `debounce` parameter to it.  Heh.  Then, creating the actually-debounced functions can just be another part of initialization.
