Journal 2019-05-24 - Keyed Requests, Options, and Other Things Derived Therefrom
========

With an eye towards Typescript support, AsyncData, and RefreshableData.  Maybe I'll muse on Subscriptions here, too.  Dunno.  Subscriptions are a pretty big topic.



## Over All Usage Concerns

- Data access should use AsyncData because there is no value outside of the AsyncData.Data case.
    - RefreshableData will not be considered here at all.  That is a specialized concern.
- Request Actions however will follow the typical imperative style of possibly-rejecting `Promise<T>`, rather than always returning `Promise<AsyncData<T, AxiosError>>`.
    - It _should_ always give us back `Promise<T>` but it's entirely possible we may get `Promise<void>` (or `Promise<unknown>`) due to how Vuex creates its return value based on whether or not more than one action matches a given dispatch.  That said, we control the names here, so that shouldn't be a concern.  If it is, it's an error.

Some things that would be nice, but probably won't occur:

- Values in AsyncData should be immutable.
    - The Client should never mutate data coming from the server.  Rather, it should always clone such data since any mutation is likely for the purposes of some other state which is only tangentially related to the original data sent from the server.  Form State is probably the most common case.
    - It might be possible to assert this with some custom `DeepReadonly<T>` type, but I'm not sure I want to try that immediately.  Maybe as a later thing?
        - Could lead to a constant need to do `deepCloneWritable<T>(o: T) => DeepWritable<T>` or something.  Annoying, but explicit.  Maybe not too annoying, then?



## Validation and Typing

It's one thing to manage all that data coming from the server, it's another to ensure it's actually the shape we expect, and at the very least, it'd be nice to have a type annotation somewhere that we can use with TS utilities.

I imagine a Validate utility would do something like `<T>(v: any) => Either<T, ValidationError>`.  Or it could just throw, either way.  Then, that can be used by the fetch machinery to map a result to `AsyncData.Data` or `AsyncData.Error` as appropriate.

The very bestest would be to automatically codegen this stuff from a Swaggerdoc or other such thing.



## Permissions and Capabilities: Can the User Do X?

Another thing to do is to be able to uniformly manage Permissions and Capabilities queries, which to my mind are the same thing as far as the UI is concerned.  Sure, there might be a difference of _why_ the User can or cannot do X, but at the end of the day that's just a Negative Response versus a Positive Response.



## Actual Usage

The exact shape of the `RequestDef` type doesn't really matter so long as all the necessary features are covered.  All that matters is that regardless of the target request interface, all Requests are defined using the same `RequestDef` type.  Let implementation code map everything to the target environment.

> That said, we're using Axios so our `RequestDef` will probably be pretty close to that.

While below I used a tuple shape, what I'll probably use is something more like this:

```
<TData>{
    method: 'POST' | 'GET' | ...;
    url: string;
    // Values will all be cast with `String()`.
    query: { [key: string]: any };
    // other stuff...
    validate?: (data: unknown) => TData;
}
```

Actual usage will likely not ever reference the `RequestDef` type at all.  Rather, at most it'll be used to assert that the shape of the incoming definition conforms to the shape of `RequestDef` (that is, `T extends RequetsDef`) but will otherwise be treated as itself rather than as `RequestDef`.  It's easier that way, and requires less faffing.

Uniformity in Request Definitions could be handled by actual Request Definer Functions, but otherwise I'm not sure there's much to do.  Keeping it simple is its own reward.  And, using tuples, as cute as they are, is a false economy here.


### Actual Definition of Actual Usage

This was meant to look more at practical usage of the above blather, so here we go.

First and foremost, we have to define all our requests.  Since the API doesn't provide any sort of schema or interface definition (such as a Swaggerdoc/OpenAPI Doc) all our validation is manual.

Theoretically, we should throw an error for any schema mismatches, and indeed the validate functions will be setup thus, either returning the value or throwing.

Practically, I'm not sure if this is the behavior we want, but to start I'll do it.  I'm not sure quite yet about the actual validation definition, but for now I'm just using the generic `<T>(v: unknown) => T` definition because that's all we need.  Anything inside is an implementation detail, and for the invalid case it throws.

> NOTE: I think most schemas will be extensible, that is they won't throw if there are extra props because for the most part we don't care about those.  We only care about the props we require, or for optional props, that if present they conform to the expected shape.

First thought:

```
const requests = {
    getFoo: (params: { id: number }) => defRequest.get(
        `/api/service/foo/${params.id}`,
        {
            // validateFoo = ???
            validate: validateFoo,
        }
    ),
}
```

Second thought:

```
const requests = {
    getFoo: defRequest.get(
        (params: { id: number }) => [
            `/api/service/foo/${params.id}`,
        ],
        {
            // validateFoo = ???
            validate: validateFoo,
        }
    ),
}
```

Theoretically, the second could have fewer allocations, but practically I'm not sure such allocations are avoidable.  The only truely annoying allocation is the validate function, and that's entirely dependent on how you create those validate functions.

If we wanted to avoid having to assume caching, we could use a defaults type thing, though that's noisy:

```
const requests = {
    getFoo: requestWithDefaults(
        (params: { id: number }) => defRequest.get(
            `/api/service/foo/${params.id}`
        ),
        {
            validate: validateFoo,
        }
    )
}
```

Where `requestWithDefaults` is just `<P, R>(f: (p: P) => R, ds: Partial<R>) => ((p: P) => R) & { $defaults: Partial<R> }`.

#### On `requestDef.get()` and Friends

Here, `requestDef.get()` and its friends for each other HTTP method intentionally copy the same shorthands from Axios: Methods with no body accept a URL and Options, while Methods with a body accept URL, Body, then Options.  All of them return an Axios Request Options object, with some extra stuff for our use case.  Mostly validation.

Thus:

- `requestDef.get = (url, options?) => RequestDef`
    - Same for `head`, `delete`, and `options`.
- `requestDef.post = (url, body?, options?) => RequestDef`
    - Same for `put` and `patch`.

> _Entirely coincidentally_, `RequestDef` will most likely be `AxiosOptions` plus the above-stated extra stuff, such as Validation.

Ultimately, I came up with this:

```
import { AxiosRequestConfig } from 'axios';

export enum HttpMethod {
  head = 'head',
  options = 'options',
  get = 'get',
  delete = 'delete',
  post = 'post',
  put = 'put',
  patch = 'patch',
}

export interface RequestConfig<TData = unknown> extends AxiosRequestConfig {
  params?: URLSearchParams | object;
  validate?: (datum: unknown) => TData;
}

// We use `extends RequestConfig` because we want to have literal types
// for type derivation reasions.
// This requires TS >= 3.2
export default function createDefRequest<TDefaults extends RequestConfig>(
  defaults: TDefaults
) {
  function $defRequest<TConfig extends RequestConfig>(
    options: TConfig = {} as TConfig
  ) {
    return {
      ...defaults,
      ...options,
    };
  }

  // Short-Hands

  $defRequest.head = <TConfig extends RequestConfig>(
    url: string,
    options: TConfig = {} as TConfig
  ) => $defRequest({ ...options, method: HttpMethod.head, url });

  // repeat for options, get, delete...

  $defRequest.post = <TConfig extends RequestConfig>(
    url: string,
    data: any,
    options: TConfig = {} as TConfig
  ) => $defRequest({ ...options, method: HttpMethod.post, url, data });

  // repeat for put and patch...

  return $defRequest;
}
```

#### On Validated Values

A few practical concerns to cover here.

- Initially, there will be no actual validation.  This mirrors the current setup.  Validation will be added later, and should not be necessary now to actually start using the new setup.
- As an implementation detail, values will only be validated once: When the response is initially received.  After that, it's assumed the value is valid, so no additional validation will occur, only type corecion for TSServer.


### Actual Usage of Actual Usage

- `dispatchRequest(store, requestDef, params?): Promise<T>` does the actual diddlydo of requesting.  This is one of the most common things to use.
    - This returns `Promise<T>` and possibly throws to support the normal imperative mode of operation, which is useful for avoiding having to monadize every single stinkin sequence of steps.  I mean, we could, but it's annoying and asking people to use AsyncData is already a reach.
- `getRequestData(store, requestDef, params?): AsyncData<T, Error>` does the getting of actual request data from the store, with a default value of `NotAsked` for any as-of-yet unasked requests of course.
- `getHasPermission(store, requestDef, params?): boolean` does a permission check based on the current state.  Default value is false, because if you have to ask you can't do it.  That said, permissions just are not used for many things yet.
- `dispatchClearRequestData(store, requestDef, params?): void` deletes the store record for the given request data, effectively resetting it to `NotAsked`.  This isn't usually needed, but is provided because `NotAsked` is an inititial state and there are a few cases where it's meaningful.

> If we wanted to have `dispatchRequest` return `Promise<void>` we'd have to do something like `getRequestDataOrThrow()`, but anyway.  (EDIT: Or `AsyncData#getDataOrThrow()` as shown below)  In our actual code, we'll only have a single namespaced module for requests, so no other action handlers should trigger as a result of `dispatchRequest` being called, meaning we can proceed with the current implementation idea.


### Actual Usage of Actual Usage of Actual Usage

That's 3 deep, so far!

Coming to the actual store module, after faffing about with request definition creation, I think just doing this is fine:

- `dispatchRequest(store, requestDef): Promise<T>`
- `getRequestData(store, requestDef): AsyncData<T, Error>`
- `getHasPermission(store, requestDef): boolean`
- `dispatchClearRequestData(store, requestDef): void`

That saves us from having to do weird things with the actions and getters, and additionally keeps it to the expected Vuex Dispatch interface of just a single payload, which I accidentally violated in the prior interface.

Anyway, the prior one shoulda been `requestDefCreator` anyawy, because `requestDef` is what gets created.  Here, we're delegating the creation of the requestDef to the point of use, saving us having to do that in the action.  After all, we don't really care how the request is created, or even if it's defined elsewhere, all we care about is the request.  Fewer assumptions!


### Point of Use of Actual Usage of Actual Usage of Actual Usage

```js
import { Vue, Component } from 'vue-property-decorator';

@Component({ name: 'FooComponent' })
export default class FooComponent extends Vue {
    // First we get any parameter requirements.
    get fooId() {
        if (this.$route.params.fooId) {
            return Number(this.$route.params.fooId);
        }

        return null;
    }

    // Then we create the request def itself.
    get getFooRequest() {
        if (this.fooId != null) {
            return requests.getFoo({ id: this.fooId });
        }

        return null;
    }

    // Then we use it.
    created() {
        if (this.getFooRequest) {
            dispatchRequest(this.$store, this.getFooRequest);
        }
    }

    get getFooData() {
        // Returns an AsyncData so we always have a value present.
        // It'll be either NotAsked or Waiting until the request
        // settles, at which point it'll become Data or Error.
        return readRequestData(this.$store, this.getFooRequest);
    }
}
```

Given Vue's reactivity system, we could send a new request each time the request def changes, but more commonly that's based on other things, such as user interaction and/or timers.



## Implementation


### Implementation: Dispatch Request

This is the main thing part of this module: The part that actually dispatches requests!

It encodes the following behavior:

1. If there's a pending request, return a promise for that request.
    - Otherwise, continue.
2. Create a promise for the actual underlying request:
    - For Resolutions:
        1. Validate the data.
            - NOTE: If the validation fails, it should throw an error.  This is because the rest of the code is depending on incoming data matching the defined types, and the only way we know that is if it validates.
        2. Save the Validated Data to the State and null-out the pending Promise.
            - NOTE: If for some reason the Response is needed, that can also be saved to the state here.  In my initial implementation, it's discarded.  This is because the Response and the Validated Data are two separate things.
        3. Return the Validated Data for imperative flows.
    - For Rejections:
        1. Save the Error to the State and null-out the pending Promise.
        2. Rethrow the same error.
3. Save that created and mapped pending Promise to the State.

#### Consideration: Uncaught Rejections

> TL;DR: Gonna stick with the current behavior of throwing on error conditions, even though just always resolving to AsyncData instead of throwing errors would be Better-with-a-capital-B.

Technically, the browser won't stop on uncaught rejections, but they will still show up in the console, even though if a request rejects it's not really a show stopper for us.

I wonder, then, if it wouldn't be more appropriate to have the request return `Promise<AsyncData<D, E>>`?

That would cause issues with imperitive workflows such as form submission, though.

I think, then, that perhaps it'd be better to not throw by default, but rather opt into that?  Hm.

```js
export default class Foo extends Vue {
    handleSubmit() {
        const data = this.createNormalizedData();

        try {
            await this.dispatchValidation(data);
            await this.dispatchSubmission(data);
            dispatchAddNotice(this.$store, {
                style: 'success',
                text: 'You succeeded at winning the mission!',
            });
            this.$emit('foo-complete');
        } catch (error) {
            dispatchAddNotice(this.$store, {
                style: 'error',
                text: `Not so fast, Gordan!  ${error.message}`,
            });
            this.$emit('foo-error');
        }
    }

    async dispatchValidation(data) {
        // For this example, dispatchRequest returns Promise<AsyncData<D, E>>
        const result = await dispatchRequest(
            this.$store,
            requests.validateFoo({
                foo: data,
            })
        );

        return result
            .flatMap(validationResult => {
                if (validationResult.status === 'PASS') {
                    return AsyncData.Data(validationResult);
                }
                return AsyncData.Error(Object.assign(
                    new Error('Validation failed'),
                    {
                        validation: validationResult,
                    }
                ));
            })
            // NOTE: New method on AsyncData.
            .getDataOrThrow();
    }

    async dispatchSubmission(data) {
        // For this example, dispatchRequest returns Promise<AsyncData<D, E>>
        const result = await dispatchRequest(
            this.$store,
            requests.putFoo({
                id: this.fooId,
                foo: data,
            })
        );

        return result.getDataOrThrow();
    }
}
```

Or, more explicitly,

```js
@Component()
export default class Foo extends Vue {
    get dataForSubmission() {
        return this.createNormalizedData();
    }

    get validationRequest() {
        return requests.validateFoo({
            id: this.fooId,
            foo: this.dataForSubmission,
        });
    }

    get submissionRequest() {
        return requests.putFoo({
            id: this.fooId,
            foo: this.dataForSubmission,
        });
    }

    dispatchValidation() {
        // For this example, dispatchRequest returns Promise<AsyncData<D, E>>
        return dispatchRequest(
            this.$store,
            this.validationRequest
        )
        .then(data => data
            .flatMap(validationResult => {
                if (validationResult.status === 'PASS') {
                    return AsyncData.Data(validationResult);
                }
                return AsyncData.Error(Object.assign(
                    new Error('Validation failed'),
                    {
                        validation: validationResult,
                    }
                ));
            })
        );
    }

    dispatchSubmission(data) {
        // For this example, dispatchRequest returns Promise<AsyncData<D, E>>
        return dispatchRequest(
            this.$store,
            this.submissionRequest
        );
    }

    handleSubmit() {
        try {
            // I actually quite like this.
            // But, see below on analysis.
            (await this.dispatchValidation()).getDataOrThrow();
            (await this.dispatchSubmission()).getDataOrThrow();
            dispatchAddNotice(this.$store, {
                style: 'success',
                text: 'You succeeded at winning the mission!',
            });
            this.$emit('foo-complete');
        } catch (error) {
            dispatchAddNotice(this.$store, {
                style: 'error',
                text: `Not so fast, Gordan!  ${error.message}`,
            });
            this.$emit('foo-error');
        }
    }
}
```

As much as I personally like that, I'm not sure that'll fly with other developers.  All of this is a balance between what I view (currently) as a more ideal interface and what I think I can get away with putting on to other devs who possibly aren't as enamored with functional style programming as I am.

So, as sad as it makes me, I'll stick with the current approach of just having `dispatchRequest` throw.  I'll keep that `AsyncData#getDataOrThrow()` method in mind, though, that might still be handy.


### Circling Back Around to Permissions

Permissions... With the current setup, doing Requests uniformly is easy, but being able to tell if a User can call an endpoint isn't as easy, if only for the reason that you don't necessarily need the whole request.  Rather, you only need part of it.

On top of that, in our API we have certain permissions that aren't actually method-level, rather they're feature-level.  That is, you might be able to call a certain endpoint or get certain data, but there's another permission that affects what you can do called something like `READ_SECRET_VALUES`.

Because of things like this, and the fact that we didn't have a dedicated Requests module before, our project currently has Permissions setup entirely separately from everything else.

However, that's not to say we couldn't do something to make things easier.

Part of the current Permissions setup is that our Requests stuff was handled piecemeal all over the place, everything was arbitrary.  Now, however, we have a central location for Request data.  Further more, we also have entirely separate Request Config Creators.  These things let us vastly simplify permissions definitions.

Now, definitions will have these parts:

- The Request that gets the data that has the desired permissions information.
    - Now we know both where to get the data, _and_ how to request it, because as far as the Requests module is concerned, those are the same thing.
- An Extractor that gets the target data from the Request Data rather than going the extra step of picking an arbitrary location in the state. (or what getter to use, as the case was)
- The Permission Type we want to check.

This doesn't actually differ much from the existing setup except that the Permission Definition knows, as a matter of actually getting the source data, just which Request gets that data.  Further, that Request dependency is actually shown in the code via an import.  This is so much more explicit.


### Store-Derived Data?

Or, do I want to auto-inject Store stuff into Request stuff?

As neat as that sounds, it is a further weird thing to do, and I'm not sure there's much gain aside from "Selected Entity" type things.  And, honestly, not sure I care about that that much.

I'll leave it aside, for now, the current interface is quite simple and I quite like it therefore.  Another benefit: Don't need to think about how to handle no-currently-selected-entity cases.  (On the other hand, that gets repeated everywhere in the views, and the case is basically handled by just not requesting the data.)



## Typescript Faffing


### Round 1: Fight!

> NOTE: As noted somewhere above, I ended up just using a record rather than tuple+record, because dealing with only one shape is much easier and records are more obvious.  KISS is its own reward.  (The band or the principle?  You decide.)

> NOTE 2: Most of the funny typing below didn't get used.  (It was fun, though.)  The most I did was `TConfig extends RequestConfig` because that's really about all we need to do.  By maintaining literal/const types and using that `extends` constraint, we get both an enforce shape and exact types.  Score.

```
// TODO: This type.
type RequestOptions = object;

type RequestDef = [
    'GET' | 'OPTIONS' | 'DELETE' | 'PUT' | 'POST' | 'PATCH' | 'HEAD',
    string,
    RequestOptions
];

type EntityId = number | string;

// Request definition.
// Less noisy than writing "as RequestDef" everywhere.
function r(
    method: RequestDef[0],
    path: string,
    options: RequestOptions = {}
): RequestDef {
    return [method, path, options];
}

const requests = {
    getFoosOfParent: ({ parentId }: {
        parentId: EntityId,
    }) => r('GET', `/parents/${parentId}/foos`),
    getParents: () => r('GET', '/parents'),
    // ... etc.
}

// Just to save some typing.
type TRequests = typeof requests;

type RequestArgsType<TKey extends keyof TRequests> =
    TRequests[TKey] extends (...args: infer TArgs) => any ?
        TArgs
    : never;

// Example usage of args.
function request<
    TKey extends keyof TRequests
>(
    key: TKey,
    ...args: RequestArgsType<TKey>
) {
    // ...
}

// These work as expected, though.
request('getFoosOfParent', { parentId: 10 });
request('getParents');
```

Trying to use the args type with the function is problematic, though:

```
function request<
    TKey extends keyof TRequests
>(
    key: TKey,
    ...args: RequestArgsType<TKey>
) {
    const requestDef = requests[key];
    // Type Error: Expected 1 arguments, but got 0 or more.
    return requestDef(...args);
}
```

Directly referencing the index yields `unknown`.

```
function request<
    TKey extends keyof TRequests
>(
    key: TKey,
    ...args: RequestArgsType<TKey>
) {
    const requestDef = requests[key];
    // Argument of type 'unknown' is not assignable to parameter of type '{ parentId: EntityId; }'.
    return requestDef(args[0]);
}
```

Trying to switch on length does nothing:

```
function request<
    TKey extends keyof TRequests
>(
    key: TKey,
    ...args: RequestArgsType<TKey>
) {
    const requestDef = requests[key];
    // Expected 1 arguments, but got 0.
    if (args.length === 0) return requestDef();
    // Argument of type 'unknown' is not assignable to parameter of type '{ parentId: EntityId; }'.
    else return requestDef(args[0]);
}
```

Hm.

Okay, explicitly gerenicizing the retrieved function works:

```
function request<
    TKey extends keyof TRequests
>(
    key: TKey,
    ...args: RequestArgsType<TKey>
) {
    // Not necessary, but it's explicit and avoids typing "typeof ..." everywhere.
    type TArgs = typeof args;
    // Now the function definitely takes "args" as its tuple of args.
    const requestDef = requests[key] as (...a: TArgs) => RequestDef;
    // Run-time check, just in case.
    if (! requestDef) throw new Error(`"${key}" is not a defined request`);
    // No more type error.
    return requestDef(...args);
}
```

Which means we can wrap that to avoid duplicating that cast:

```
// Either gets the def or throws an error.
// Type-checked code should never throw a runtime error.
// Theoretically.
function getRequestDef<TKey extends keyof TRequests>(key: TKey) {
    const requestDef = requests[key] as (...args: RequestArgsType<TKey>) => RequestDef;
    if (! requestDef) throw new Error(`"${key}" is not a defined request`);
    return requestDef
}

function request<
    TKey extends keyof TRequests
>(
    key: TKey,
    ...args: RequestArgsType<TKey>
) {
    const requestDef = getRequestDef(key);
    // No type errors :D
    return requestDef(...args);
}
```



## Updates After Some Usage


### Actions Revisions

After some actual usage, I think the following operations are handy to define:

- `dispatchRequestAsync(store, requestConfig): Promise<void>` The basic-most operation.  It dispatches a request and, as a concession to other things, returns a promise.  The Promise always resolves to nothing and never rejects.
    - This is basically a wrapper around the Vuex action itself.
- `dispatchRequest(store, requestConfig): void` The most commonly used one: this uses `dispatchRequestAsync` but discards the promise, making dispatch of the request a pure side effect, and making it easier to use in projects which require proper handling of all promises.
- `dispatchRequestThenReadData(...): Promise<AsyncData<TData, TError>>` basically just used for the following, but may be useful?
- `dispatchRequestThenGetDataOrThrow(store, requestConfig): Promise<TData>` Common for imperative flows like in form validation, by doing the following:
    - `return dispatchRequestThenReadData(...).then(data => data.getDataOrThrow())`
- `dispatchRequestIfNotNull(...): void` Like `dispatchRequest` in that it's a pure side effect, but unlike `dispatchRequest` it only dispatches if the request argument is not null.
- `dispatchRequestAsyncIfNotNull(...): Promise<void>` Async version of `dispatchRequestIfNotNull` for those cases where you do need a promise combined with conditional dispatch.


### Readers Revisions

Also, a lesson learned about Readers: Don't try to be clever using Getters that return functions.  Those don't really work.  Better to just directly access store state, that gives better update subscriptions.


### AsyncData Operators Gained From This

Initial work led to the addition of `.getDataOr(elseValued)` and `getErrorOr(elseValue)`, but as noted above, a new one would would enable some common workflows to be more cleanly implemented:

- `.getDataOrThrow(): TData` does what the name implies: gets the data value or, if the AsyncData is not in the Data case, throws an error.
    - In this case, I may want a default behavior along with another one:
        - `.getDataOrThrow(mapMaybeError: (error: unknown) => Error)`
    - That might save on some extra `try/catch` wrapping.  Or maybe not.  Not sure!  But at least `.getDataOrThrow()` is itself useful.


### Type Revisions

This is more to do with the Request Config Creators than anything, but using `T extends RequestConfig<U>` was a bad idea: it's unnecessary, doesn't actually provide any benefits, and makes the type information significantly noisier for other devs.  Anything important should be made into an explicit type parameter and otherwise left generic to the type definition.
