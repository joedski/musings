Journal 2019-07-19 - Permissions by Entity and Keyed Requests
========

Currently, in one app I'm working on, Permissions Checks are implemented as Predicates.  Specifically, they accept the Store and (optionally) a Parameters object, and return a boolean value.

Requests however were implemented in a different way: They only accept parameters and return an object describing the request.  This object is then passed to the actual handler.  _Entirely Coincidentally_ the Request object is an Axios Request Config object with some extra bits on it.

Obviously it'd be better if Permissions themselves were implemented in the same way Requests were, but they came before the Requests Module, so here we are.



## On the API Being Closer to Requests

What would the Permissions Predicates look like if I were writing them now?  Probably like this:

```js
const canCreateChildInParent = (params) => ({
    request: requests.parent({ id: params.parentId }),
    extractor: (data) => data.permittedOperations,
    operation: OperationType.CREATE_CHILD,
});

import { hasPermission } from '@/store/requests';

// hasPermission returns AsyncData<boolean, Error>
const hasPermissionCreateChildInParent =
    hasPermission(canCreateChildInParent({ parentId: 5 }))
        .getDataOr(false);
```

Though, I'm not actually sure if there's any value to returning `AsyncData`, given that if you're in doubt, just deny, and so far there's no use for the loading state there.  But anyway, there's what it'd look like.

Now, I could just refactor everything now, there isn't that much there yet.  But, do I need to?  Granted, I'm the only one that's touched the permissions thing so far.


### Something Closer to Current API

Current API usage is like this:

```js
function canUserPredicate(
    extractor /* (input: I, params?: P) => OperationType[] | null */,
    key /* OperationType */
) {
    return function $predicate(input, params) {
        const permissions = extractor(input, params);
        if (!Array.isArray(permissions)) return false;
        return permissions.includes(key);
    };
}

const canCreateChildInParent = canUserPredicate(
    (store, params) => {
        const parent = getParent(store, params.parentId);
        if (!parent) return null;
        return parent.permittedOperations;
    },
    OperationType.CREATE_CHILD
);

const hasPermissionCreateChildInParent =
    canCreateChildInParent(this.$store, { parentId: 5 });
```

At the very least, we can compactify things a bit.

```js
const canCreateChildInParent = canUserPredicateFromRequest(
    requests.parent,
    (datum, params) => datum.permittedOperations,
    OperationType.CREATE_CHILD
);

const hasPermissionCreateChildInParent =
    canCreateChildInParent(this.$store, { parentId: 5 });
```

Granted, in our app, we usually get collections at the top level rather than requesting each one one-at-a-time, but it's basically the same as the above:

```js
const canCreateChildInParent = canUserPredicateFromRequest(
    requests.parents,
    (datum, params) => datum
        .filter(p => String(p.id) === String(params.parentId))
        .map(p => p.permittedOperations)[0],
    OperationType.CREATE_CHILD
);
```

But with this, we can not only extract the datum from the Store based on the request (and parameters), we can also issue a request for the data we extract from.  It'll be done by just attaching a property named something like `request`:

```js
import { dispatchRequest } from '@/store/requests';

const promise = dispatchRequest(
    this.$store,
    canCreateChildInParent.request({ parentId: 5 })
);
```

So, there's that.
