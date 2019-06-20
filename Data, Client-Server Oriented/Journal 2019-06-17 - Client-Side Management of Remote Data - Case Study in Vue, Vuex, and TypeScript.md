Journal 2019-06-17 - Client-Side Management of Remote Data - Case Study in Vue, Vuex, and TypeScript
========

Primary Goals:

- Minimize arbitrarily defined State Structure: State should be as consistent in shape as possible, and as minimal in complexity as possible.
- Make the most common operations convenient:
    - Initiating Requests.
    - Deriving Data.
    - Properly rendering Waiting and Error Ctates.
    - Checking any Defined Permissions.

This suggests some API details right off:

- Requests are managed via an Action.
- The Request Action implements the customary behavior of returning a Promise which either...
    - Resolves with a Value.
    - Rejects with an Error.
- Data in the State is stored in AsyncData, to enforce that:
    - In states where there is no Data available, it is not meaningfully accessible.
    - In states where there is no Error available, it is not meaningfully accessible.
    - Etc.
- Permissions for a Request should be consistent to access, mirroring the same way a Request itself is dispatched.

NOTE: Examples will be geared towards the use of [typesafe-vuex](https://www.npmjs.com/package/typesafe-vuex) because that's what the current project is using.



## Musing: Round 0

Some immediate thoughts:

- It's hard to beat the "pile of functions with incidentally identical names" currently used for Permissions.  Anything else had better really bring value to things or else it's just added noise.
    - The only thing that could possibly bring value is if the Permissions included the Source Request.  Hm.


### Actual Requests

```js
/** @type {Promise<T>} promise! */
const requestPromise = dispatchRequest(
    this.$store,
    cicdSystemRequests.getAppsOfSelectedProduct
);

/** @type {AsyncData<T, Error>} data! */
const data = getRequestData(
    this.$store,
    cicdSystemRequests.getAppsOfSelectedProduct
);
```

And I guess here those could be implemented as aliases to:

```js
/** @type {Promise<T>} promise! */
const requestPromise = dispatchRequest(
    this.$store,
    cicdSystemRequests.getAppsOfProduct,
    { productId: Number(this.$route.params.productId) }
);

/** @type {AsyncData<T, Error>} data! */
const data = getRequestData(
    this.$store,
    cicdSystemRequests.getAppsOfProduct,
    { productId: Number(this.$route.params.productId) }
);
```

> ASIDE: That doesn't let us directly use the accessor created by `typesafe-vuex`.  We'd need a wrapper.  It also doesn't do anything about passing additional arguments... Hm.  Though, maybe just special meta-arguments could be passed, like `$force: boolean` or something?  Need some way to keep things open to extension.

What is the shape of `cicdSystemRequests.getAppsOfSelectedProduct` or `cicdSystemRequests.getAppsOfProduct`?  Who knows!  That's an implementation detail.

An implemetation detail that I want to flesh out here... so.  I guess that means I'll know.

From the section "Longer Term Goal: Validation" below, we can also see that we might want a separate item for the few cases where we need the request itself:

```js
/** @type {AsyncData<AxiosResponse<T>, Error>} response! */
const responseAsyncData = getRequestResponse(
    this.$store,
    cicdSystemRequests.getAppsOfProduct
    { productId: Number(this.$route.params.productId) }
);
```

> Maybe I should add a method `AsyncData#getDataOrThrow()` in cases where we really should have a Data, and where anything else would really be an Error.  This is again to make use of AsyncData ergonomic in a more imperative context.


### Implementation Thoughts: Request Shape

The shape will basically be just what all we need, to be created with some convenience functions.  ``defineRequest.get((params) => `/foo/${params.fooId}`, ...)`` and so on.

What all do we need?

- Required:
    - URL
    - Method
- Nice to Have (Eventually Required?):
    - Permission: Can the User make this request?
    - Validation: Convert unknown/any to known type.

At least as far as Permissions goes, that itself is both "Based on the current state can the user make this request?" and, at least in this new setup, "What request(s?) need(s) to be made to know this?".

Hm.

```
type ValidatedRequest<P, T> = (params: P) => {
    api: 'cicada' | '';
    method: HttpMethod;
    url: string;
    permissionPredicate?: (store, params?) => boolean;
    validate: (data: unknown) => T;
};

type UnvalidatedRequest<P> = (params: P) => {
    method: HttpMethod;
    url: string;
    permissionPredicate?: (store, params?) => boolean;
};
```

That should probably work?  Though, P is also optional, so.  Hm.  There's a number of shapes we have to deal with, there.

I mean, for the most part, we should probably just use that `assumeType<T>` (non)validator mentioned below, so that that's one less shape difference to worry about, plus actually seeing an `any` in there is unusual since most of the time we either cast to a type or just ignore the data and consider an HTTP success response to be enough.  (and sometimes the body is empty!)  In such cases, it's fine to just say `assumeType<unknown>` to say that we don't care, or maybe better `discardData: () => null`.


### Longer Term Goal: Validation

Eventually, the UI should have Validation.  It's a nice to have, granted, but can help notify devs of things that might need some updating on the UI side.

To be useful for us, though, at least for mechanical type derivation, we'll need to have a function that takes an `unknown` and returns either `T` or throws.

So basically `<T>(e: unknown) => T`.

The basic-most one will be `assumeType<T>(e: unknown) => T` which is literally just `<T>(e: unknown) => (e as any as T)`.  Then, we can just do a Find All References of `assumeType` to see where we have non-validations.

Any Request Definition with no Validator has a datatype of `any`, for ergonomics.

None of this is to say it won't have a present effect.  Rather, any Request Definition without Validation will return a `Promise<AxiosResponseWithData<any>>` and `getRequestData` will have a return type `AsyncData<AxiosResponseWithData<any>, Error>`.  Or maybe that one's `AsyncData<any, Error>` and some other function like `getRequestResponse` is the bigger type...  Hm.  Probably.  Vast majority of the time, we don't need the whole Response, just the Data, so separating `getRequestData` and `getRequestResponse` makes sense.
