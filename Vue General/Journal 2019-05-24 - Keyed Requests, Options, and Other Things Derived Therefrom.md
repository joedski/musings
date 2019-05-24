Journal 2019-05-24 - Keyed Requests, Options, and Other Things Derived Therefrom
========

With an eye towards Typescript support, AsyncData, and RefreshableData.  Maybe I'll muse on Subscriptions here, too.  Dunno.  Subscriptions are a pretty big topic.



## Typescript Faffing

```
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
