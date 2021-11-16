Journal 2021-10-24 - Deriving the Requests Module from Start to Finish
======================================================================

To start with, most of these examples came from the [Redux example on reducing boilerplate](https://redux.js.org/usage/reducing-boilerplate), and this isn't meant to be a criticism of what they show but rather an extension of it: we're following it to a logical conclusion.  In fact, the changes detailed through out this document essentially reflect the process I went through to arrive at the final approach over the course of a couple different projects.

If you want to skip to the end, just hit the End button on your keyboard.

If you don't want to do that, then here's the big secret: all requests are the same, they just have different arguments.



## In the Beginning, There Were Thunks

Everything starts with the Thunk Middleware, which lets you Dispatch Functions into the Store, and some actions so that you can track the state of your request.

- We start with an `X REQUEST` action so that we can enter a "Loading" state.
- An `X FAILURE` action for if something goes wrong.
- And an `X SUCCESS` action for if we get the data we ask for.

```js
export function loadPostsSuccess(userId, response) {
  return {
    type: 'LOAD_POSTS_SUCCESS',
    userId,
    response
  }
}

export function loadPostsFailure(userId, error) {
  return {
    type: 'LOAD_POSTS_FAILURE',
    userId,
    error
  }
}

export function loadPostsRequest(userId) {
  return {
    type: 'LOAD_POSTS_REQUEST',
    userId
  }
}

export function loadPosts(userId) {
  return (dispatch, getState) => {
    const { posts } = getState()

    // Skip posts that we already loaded.
    if (posts[userId]) {
      return
    }

    dispatch(loadPostsRequest(userId))

    // We're deliberately not returning the promise, the UI will update from the state.
    fetch(`https://example.com/users/${userId}/posts`)
      .then(response => {
        if (response.ok) {
          return response
        }

        throw Object.assign(new Error(`${response.status}: ${response.statusText}`), {
          response
        })
      })
      .then(
        response => dispatch(loadPostsSuccess(userId, response)),
        error => dispa=(loadPostsFailure(userId, error))
      )
  }
}
```

It's kind of annoying to write those separate action creators for 1 request, especially that thunk creator.

Taking a closer look, we see a few things going on with those action creators up there:

- Each of the actions has 1 thing in common: the `userId`.
- On the other hand, the Success and Failure cases each add the response and error respectively.

Looking at the Thunk, we also see a couple other things going on here:

- We traverse the state tree to check if the data's been fetched before.
- We execute the request itself.

We could create a single description that encodes all of the above and hide the execution in a middleware instead of delegating things to the generic Thunk middleware.  The nice thing about working with only descriptions is that we can very easily inspect them, look at the data in them, much more easily than we can with a function which we'd have to step into.

A single Request Description Creator function then might look like this:

```js
export function loadPosts(userId) {
  return {
    // Types of actions to emit before and after
    types: [
      'LOAD_POSTS_REQUEST',
      'LOAD_POSTS_SUCCESS',
      'LOAD_POSTS_FAILURE'
    ],
    // Check the cache (optional):
    shouldCallAPI: state => !state.posts[userId],
    // Perform the fetching:
    callAPI: () => fetch(`http://myapi.com/users/${userId}/posts`),
    // Arguments to inject in begin/end actions.
    // The response and error will sit along side the one or more values here.
    payload: { userId }
  }
}
```

Which looks okay, better than nothing else.

Execution was the same everywhere, so we could just not bother with writing that over and over again and opt for our own middleware instead:

```js
export function callAPIMiddleware({ dispatch, getState }) {
  return next => action => {
    const { types, callAPI, shouldCallAPI = () => true, payload = {} } = action

    // Skip if it's not a Request Description.
    if (types == null) return next(action)

    if (
      !Array.isArray(types) ||
      types.length !== 3 ||
      !types.every(type => typeof type === 'string')
    ) {
      throw new Error('requestDescription.types must be an array of 3 strings')
    }

    if (typeof callAPI !== 'function') {
      htrow new Error('requestDescription.callAPI must be a function')
    }

    if (!shouldCallAPI(getState())) {
      return
    }

    const [requestType, successType, failureType] = types

    dispatch({ ...payload, type: requestType })

    return callAPI()
      .then(response => {
        if (response.ok) return response
        throw Object.assign(new Error(`${response.status}: ${response.statusText}`), { response })
      })
      .then(
        response => dispatch({ ...payload, response, type: successType }),
        error => dispatch({ ...payload, error, type: failureType })
      )
  }
}
```



## Further Friction: Feels Repetitious and Not DRY, but How?

The above is a good start, but when we start writing out more requests we still see a bit of boilerplate still popping up:

```js
export function loadPosts(userId) {
  return {
    types: [
      'LOAD_POSTS_REQUEST',
      'LOAD_POSTS_SUCCESS',
      'LOAD_POSTS_FAILURE'
    ],
    shouldCallAPI: state => !state.posts[userId],
    callAPI: () => fetch(`http://myapi.com/users/${userId}/posts`),
    payload: { userId }
  }
}

export function loadComments(postId) {
  return {
    types: [
      'LOAD_COMMENTS_REQUEST',
      'LOAD_COMMENTS_SUCCESS',
      'LOAD_COMMENTS_FAILURE'
    ],
    shouldCallAPI: state => !state.comments[postId],
    callAPI: () => fetch(`http://myapi.com/posts/${postId}/comments`),
    payload: { postId }
  }
}

export function addComment(postId, message) {
  return {
    types: [
      'ADD_COMMENT_REQUEST',
      'ADD_COMMENT_SUCCESS',
      'ADD_COMMENT_FAILURE'
    ],
    callAPI: () =>
      fetch(`http://myapi.com/posts/${postId}/comments`, {
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      }),
    payload: { postId, message }
  }
}
```

Staring at it long enough, we can see there's a few things going on here:

- Each request defines 3 separate action types.
- Each of these actions creators has some assumed slice of state, but we don't know what they are here...
    - Which might not be a problem except when we need to define `shouldCallAPI`.
- The payload is important... but kind of separate from everything.
- `callAPI` calls `fetch()` with some arguments.

When we get to more than a few separate requests though, we start to run into a few issues.

- The action names are a bit problematic:
    - They're related only by name which is fine for humans but computers would have to parse the string in some way.
    - Even `string.endsWith(...)` can be annoying to deal with, we shouldn't really deal with those separate action names directly.
    - More annoyingly, we have to handle each one separately in a reducer.  That is an extreme amount of boilerplate just to add another request!
- Each request also has a separate state slice, but the path to that slice is defined in the store.
    - Traversing that path here in the request description now creates a sneaky tight binding between the request descriptions and the reducer.
        - While it's true that the structure of the state is a defined interface, the fewer places that interface is referenced the easier it is to change.  Is there a way we can do better?

There's actually another sneaky pernicious detail about that whole "separate state slice" thing:

- By requiring each request have a slice of state before hand, we now incur changes in 3 different places when we want to add a new request: The Reducer, the Component, and the Request Creator.
    - Even worse, we must now make a decision about not just where to put that request state (how it relates to the rest of the app) but also how to structure it.
    - Further, by making each request have its own separate slice in the state, we have yet another thing a developer must memorize to understand how requests fit in with application state, and that thing is specific and distinct for each request.

That seems like a rather difficult problem, if annoying now that it's been noticed.



## Further Generalization

The first thing we'll generalize here are the action creators.

- Each request has 3 action creators: `X_REQUEST`, `X_SUCCESS`, `X_FAILURE`.
    - A naive approach might be to just write an Action Type Factory to create them for us based on a name, something like `name => ['_REQUEST', '_SUCCESS', '_FAILURE'].map(t => name + t)`
        - This still doesn't solve the issue of updating the app state: just because we can now create these names for the Request Description doesn't free us of handling it in the state.  We can write a utility for that too, but perhaps there's a better way?

Instead of creating separate actions for each part of each request, let's define 3 actions for _all_ requests: `REQUEST_EXECUTE`, `REQUEST_SUCCESS`, `REQUEST_FAILURE`

This necessarily implies something very important about how we'll handle state: because we know of only 3 actions for _all_ requests, we necessarily know _nothing_ about a _specific_ state path to the requests's state slice; rather, we only know _general_ information about where the state is for _all_ requests, and for the state path that essentially means the path to a _Requests Store Module_.

Where does anything specific about any given request live?

In that request's description!

And this also helps solve that more annoying issue of the state path: if every request's state lives in a common prefix path we don't need anything more complex than a single sub-property, or _key_.

Amusingly, we've seen a common string used in each request description above:

- for `loadPosts`, it was `LOAD_POSTS`
- for `loadComments`, it was `LOAD_COMMENTS`
- for `addComment`, it was `ADD_COMMENT`

These seem like reasonable keys to use.  After all, if they're unique within our "request definitions" namespace, they're unique enough for the state, right?

It's a place to start, anyway, so we can go with that.

Regardless of what we do about the key, the above ideas also simplify `shouldCallAPI` which changes from a predicate on the whole app's state to a predicate on just the requests's own state.

Taken together then, our Request Description might now like this:

```js
export function loadPosts(userId) {
  return {
    key: 'LOAD_POSTS',
    shouldCallAPI: state => state != null,
    callAPI: () => fetch(`http://myapi.com/users/${userId}/posts`),
    payload: { userId }
  }
}
```

Which is a reasonable start, we've missed something here: the `userId`!  We wanted to keep each user's posts separately so we could refer to the posts of every user of interest, which means we need to also parametrize the key itself off the Request Description Creator's arguments!  This is of course simple enough, but easily missed at first:

```js
export function loadPosts(userId) {
  return {
    key: `LOAD_POSTS(${userId})`,
    shouldCallAPI: state => state != null,
    callAPI: () => fetch(`http://myapi.com/users/${userId}/posts`),
    payload: { userId }
  }
}
```


### On Reading Requests

At first, it might seem reasonable to just use the same key to access the request state, but that key is actually an internal detail of the Request Description itself.  As seen above there are cases where we actually want to have some amount of key creation logic and we don't want to duplicate that logic every time we want to read a request's state, that's not DRY.

But any component that interacts with the request at all necessarily knows about the Request Description Creator, so why not just use that?

In fact, why bother always indexing into the created Request Description when we can just pass that whole thing to some Selector?

That is:

```js
// With the useSelector() hook...
const requestState = useSelector(selectRequestState(loadPosts(chosenUserId)));

// or in a middleware...
const requestState = selectRequestState(loadPosts(chosenUserId))(getState());
```

Effectively, we index into the requests's state using the request description itself, which means all any given part of the application needs to know to both dispatch a request and read its state is the request description itself!

Interestingly, as long as no part of the application directly pokes around with bits of a request description, this makes it so we're free to change the implementation at any time...


### Costs and Constraints of Generalization

It's not all sunshine and rainbows.  Besides having to specify the key (not a huge burden given we already had specific keys/paths before), we find a few other things we either skip over or have to add extra config for:

- Transforming the data received: We either save the data received as is, or we have to specify a transform in the request config itself.
    - The only sensical option is to always save the data received as is, though we can provide the option to map it during a read.
    - Personally, I'm not a fan of transforming data at any global point.  Instead, each point of use (each component) should specify whatever transform/extract/whatever else it itself needs when it needs it.  This nets us 2 useful benefits:
        1. We only need to remember 1 data shape: the one coming from the server.
        2. Each component's own expectations and handling of any data is explicit and visible in that component.
- Endpoint-specific handling of different HTTP statuses: This can be something that you might have to do especially when interfacing with APIs you don't have control over.
    - This should be handled in the request config, so on a request-by-request basis, and by forcing ourselves to put this in the Request Config we keep that request specific behavior with the rest of the request specific stuff.



## Comparison to How I Usually Write This

The above is essentially how I write my own Requests Module, as it keeps each request down to 1 thing and 1 thing only: that Request Config Creator Function.

When I write them, I usually just return a lightly extended Axios config:

```js
export function loadPosts(params) {
  return requestsModuleActions.request({
    method: 'get',
    url: `http://myapi.com/users/${userId}/posts`,
  });
}
```

Where does the key go?  I leave it to a default key creator, which simply sticks the HTTP method before the URL.  The above would thus be `GET http://myapi.com/users/2/posts` if `userId` is 2.




# Other Annoying Details

There's a few things the above doesn't yet cover which aren't exactly related to the above generalization, but are themselves most easily done when those generalizations are followed to their logical ends.

- What should we do if the same request is dispatched while it's already in progress?
- How should we handle pageable requests?
- Can we generalize the underlying request execution at all?  Should we?
- Can this be used with TypeScript or Flow?
