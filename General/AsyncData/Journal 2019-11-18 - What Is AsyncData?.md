Journal 2019-11-18 - What Is AsyncData?
========

> NOTE: This is kind of my own reflection of the [blog post about AsyncData, though they call it RemoteData](https://medium.com/javascript-inside/slaying-a-ui-antipattern-in-react-64a3b98242c).

I typically refer to AsyncData as "a synchronous reflection of Promises".  And this is reflected more or less in the 4 cases of AsyncData:

- NotAsked: The promise hasn't even been created yet.
- Waiting: The promise has been created but has not settled yet.
- Data: The promise resolved, possibly to some result.
- Error: The promise rejected, possibly to some error/reason.

I also say that it's "an always-defined synchronous value representing the instantaneous state of an asynchronous process".

I think these definitions, which are almost the same, might be best reflected by showing what AsyncData is meant to replace.

```js
let hasRequestedBefore = false;
let isRequestWaiting = false;
let requestResult;
let requestError;

async function execRequest(params) {
  hasRequestBefore = true;
  isRequestWaiting = true;

  const response = await fetch(`/foo/${params.id}`);

  if (response.ok) {
    // NOTE: assuming valid JSON.
    const requestResult = await response.json();
  }
  else {
    const requestError = await response.json();
  }

  isRequestWaiting = false;
}
```

Simplistic, but anything else is really just added complexity atop the fundamental process. (and should thus be pushed off to elsewhere!)

Obviously, the above can be managed in a store, per-request, but then you have to check 2-4 props each time.  Having implemented this pattern in another project, I can say that it is manifestly terrible.  By not placing the Async nature front and center _before_ the wrapped data, the asyncness is easily forgotten and it leads to less well defined behavior.

If we instead change this to super-enum/ADT/tagged-sum of AsyncData, we have far simpler state management which more accurately models the synchronous, instantaneous state of an async process:

```js
// Assuming AsyncData is defined using daggy.taggedSum()
let requestData = AsyncData.NotAsked;

async function execRequest(params) {
  requestData = AsyncData.Waiting;

  const response = await fetch(`/foo/${params.id}`);

  if (response.ok) {
    requestData = AsyncData.Data(await response.json());
  }
  else {
    requestData = AsyncData.Error(await response.json());
  }
}
```

This, like the Promise, is a very low level and basic tool, but one which is trivial to build atop of, where as the bag-of-4-properties is not so simple to build on.

- For one, there's that issue of what to do about the previous `result` or `error` values.  (My answer of course is the 4-tuple called `RefreshableData`.)
- For another, by sticking strictly to only the state that a Promise can be in, it's far fewer cases-over-time that need to be considered, which is far easier to model mentally.
    - Remember that a Promise really only has 3 states: not-settled, resolved, and rejected.
    - However, because AsyncData must be _always_ defined, we need to include another state for not-yet-created, which is `AsyncData.NotAsked`.
