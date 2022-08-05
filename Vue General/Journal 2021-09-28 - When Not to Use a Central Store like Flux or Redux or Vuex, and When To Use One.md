Journal 2021-09-28 - When Not to Use a Central Store like Flux or Redux or Vuex, and When To Use One
====================================================================================================

Central stores are global to the entire application, and should only ever be used for things that are actually general to the entire application.

- They should not be used for page-specific requests, or any one-off requests that are not necessary for the entire application.
- They should not be used just to pass data from one component to another.



## Common Cases And How to Resolve Them


### Requests

There's 2 ways to approach this:

1. Just don't.
2. Only use it as a single unified request/caching interface for _every_ request.

#### Requests: Just Don't Use a Central Store

If all you need is to get some data, then just directly call your requestor:

```js
this.items = await axios.get('/items');
```

This can cause issues with potentially-duplicate requests if multiple components need the same data, though.  So, we can either create a base Axios instance that as part of its Adaptor checks a global cache...

... or we could implement a global cache using a central store like Vuex.

#### Requests: Only Use a Single Unified Request Interface for Every Request

Or basically `axios` but one step removed.

The primary reason to do this is to integrate request updates into your chosen project's reactivity/update setup.  In Vue, that means Vuex.

How would that work here?

```js
const itemsRequest = {
  method: 'get',
  url: '/items'
};

await this.$store.dispatch('requests/request', itemsRequest);

const itemsAsyncData = this.$store.requests.getters.requestData(itemsRequest);
const items = itemsAsyncData.map(request => request.data.content).getDataOr([]);
```

We can do this because all HTTP requests fit the same interface, and so in essence are exactly the same: they _only_ vary on their parameters.


### Passing Data Between Components

#### Passing State Between Sibling Components

The answer here is nearly always to have the parent component coordinate data across the child components.  This keeps this data tracking local to this set of pages, which is again nearly always what we want.

#### Passing Data Requested From the Server Between Sibling Components

The answer here is to nearly always have components request the data they themselves need, and almost never to share that requested data around between components, even to direct children.

Using a global unified requestor interface such as a specialized Axios instance or a Requests Vuex Module to _transparently_ handle caching allows components to act as if they're the only one that's requesting this data while also making only 1 request for the actual data at any given point in time.

When components each separately declare their data requirements from the server, they become more explicit and more maintainable.

Further, by doing this we only need to pass data identifiers instead of entire records and collections, and it does not presume the actual record/collection types used by any given component.

> Note that this does not apply to reusable generic components, but only to specific/page components.

#### Passing Data Requested From the Server Across Unrelated Parts of the Application

The answer is the same as above: pass only identifiers around, and have each component make its own specific requests using those identifiers.

#### Passing State Across Unrelated Parts of the Application

First, determine if your state is small enough that it can simply be passed (in serialized form) through a route's query params.

> As a caveat to that recommendation, also determine if having such state embedded in the route query params presents a security risk due to specially crafted URLs.

If you absolutely need to pass state around unrelated parts of the application and cannot use route query params, then creating a well defined Vuex module _might_ be the answer.  Remember that this must be something general across the entire application, and must also be something that cannot be accomplished by just re-requesting data from the server.



## Examples of Where a Vuex Module May Be Appropriate

