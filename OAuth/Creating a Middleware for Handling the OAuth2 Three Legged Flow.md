Creating a Middleware for Handling the OAuth2 Three Legged Flow
===============================================================

I decided to reimplement a middleware for handling three-legged flows just to re-up my knowledge on how it works, and some of the things I needed to do for at least semi-real-world use.



## Outline of Operation

> NOTE: This will not be using refresh tokens because the services at my job don't support those, so there's no point to me doing them.  Hopefully the result will be exstensible enough to add that.

- _Client_ requests _Target Resource_ on _Our Server_.
- Is the _Target Resource_ one for which a _Valid Session_ is required?
  - If No, respond with _Target Resource_.
  - If Yes, continue.
- _Our Server_ checks if _Client_ has a _Valid Session_:
  - Does the _Client_ have any session at all?
    - If No, create a new session and continue.
      - NOTE: In my concrete implementation, it is expected by the OAuth Validation middleware that a session was created before this, so no session results in an error.
    - Otherwise, continue.
  - Does the _Client_ have a valid session?
    - If No, is the request for a resource for which we should redirect invalid requests?
      - If Yes:
        - Save the path to the _Target Resource_ on the _Session_.
        - Create a new _State_ on the _Client_'s _Session_.
        - Redirect _Client_ to the _IDP Authorization URL_.
        - NOTE: Another request reaching this branch will invalide a previous one!
      - If No, Respond with 401.
    - If Yes, continue.
  - If continued to here, continue.
- If continued to here, respond with _Target Resource_.

For handling callbacks from IDP Authorization:

- _Client_ requests _Authorization Callback_ on _Our Server_:
  - Does the _Client_ have a _Session_?
    - If No, Respond with 400 and tell the User they are a Bad Person who should Feel Bad.
    - If Yes, continue.
  - Does the _Request_ include a _Code_?
    - If No, Respond with 400, Invalid Callback: Missing or Invalid Code.
    - If Yes, continue.
  - Does the _State_ in the Request match the _State_ expected for their _Session_?
    - If No, Respond with 400, Invalid Callback: Missing or Invalid State.
    - If Yes, continue.
  - Delete the _State_ from the _Session_.
  - Use the _Code_ to request an _Authorization Token_ using the _IDP Token URL_:
    - If Success:
      - Save the _Authorization Token_ on the _Session_.
      - Continue.
    - If Error:
      - Respond with a 400, Invalid Callback: Invalid Code.
  - Does the _Session_ have a saved _Target Resource_?
    - If Yes, redirect to _Target Resource_.
    - If No, perform _Default Valid Callback Action_.


### Implementation

I'll be using [NodeJS](https://nodejs.org/en/), [Koa](https://www.npmjs.com/package/koa), [koa-router](https://www.npmjs.com/package/koa-router), and [simple-oauth2](https://www.npmjs.com/package/simple-oauth2), as well as [a version of Request wrapped in Promises](https://www.npmjs.com/package/request-promise-native).

The test server will use mostly the same stuff as the above, with the addition of [koa-session](https://www.npmjs.com/package/koa-session).

I also as much as possible broke things out into small functions that were stuck together using `koa-compose` and a few other utilities.  Actually, mostly `koa-compose` and a conditional thingy I wrote.


### First Result

It worked pretty well, but there's still some unsatisfying parts, particularly everything to do with how I handled local context.  There's two separate parts, which I think makes it confusing to deal with: holding the session object, and holding the info that gets cached on the session object.

Dealing with the session object itself really only occurs when we're saving stuff to it, and usually we're dealing not with the session object, but with the info object we cache on the session object.  Basically, the cache object is the only thing we should really deal with for most of the middleware.

We still need to track the session object itself just because getting the session object the first time may be an async operation, but we should probably make that clearer in the local context.  Additionally, currently the same local context prop name is used across all instances, which is not good.  Even if they end up storing the same info, they should probably use different prop names to prevent Issues.

One thing that actually was really nice during development was that, while I did run into a few bugs that resulted in uncaught errors, the fact that it was broken into small functions and that those small functions (most) all had names meant the stack trace was really easy to read.



## Whack No. 2: With Refresh Tokens?

- _Client_ requests _Target Resource_ on _Our Server_.
- Is the _Target Resource_ one for which a _Valid Session_ is required?
  - If No, respond with _Target Resource_.
  - If Yes, continue.
- _Our Server_ checks if _Client_ has a _Valid Session_:
  - Does the _Client_ have any session at all?
    - If No, fail with error: "koa-oauth-three-legged: Cannot process requests which do not have a session"
  - Does the _Client_ have a valid session?
    - If No, is the request for a resource for which we should redirect invalid requests?
      - If Yes:
        - Save the path to the _Target Resource_ on the _Session_.
        - Create a new _State_ on the _Client_'s _Session_.
        - Redirect _Client_ to the _IDP Authorization URL_.
        - NOTE: Another request reaching this branch will invalide a previous one!
      - If No, Respond with 401.
    - If Yes, continue.
  - If continued to here, continue.
- If continued to here, respond with _Target Resource_.

For handling callbacks from IDP Authorization:

- _Client_ requests _Authorization Callback_ on _Our Server_:
  - Does the _Client_ have a _Session_?
    - If No, Respond with 400 and tell the User they are a Bad Person who should Feel Bad.
    - If Yes, continue.
  - Does the _Request_ include a _Code_?
    - If No, Respond with 400, Invalid Callback: Missing or Invalid Code.
    - If Yes, continue.
  - Does the _State_ in the Request match the _State_ expected for their _Session_?
    - If No, Respond with 400, Invalid Callback: Missing or Invalid State.
    - If Yes, continue.
  - Delete the _State_ from the _Session_.
  - Use the _Code_ to request an _Authorization Token_ using the _IDP Token URL_:
    - If Success:
      - Save the _Authorization Token_ on the _Session_.
      - Continue.
    - If Error:
      - Respond with a 400, Invalid Callback: Invalid Code.
  - Does the _Session_ have a saved _Target Resource_?
    - If Yes, redirect to _Target Resource_.
    - If No, perform _Default Valid Callback Action_.

For handling logouts:

- Delete local info from the session.


### Consideration: Separate Router from Auth Middleware

While we can certainly configure things once, we should probably allow separate creation of the auth router middleware from the auth checking middleware.  The router may need to be somewhere else and it's already basically its own thing anyway.  Further, we may want to allow creation of multiple auth-checking middleware instances, sometimes with slightly different configs from the base.  The top level thing then should return those middleware creators which themselves allow further individual configuration.


### Consideration: Should This Actually Fail If There's No Session Object?

Might want to at least add an option to not fail if there's no session object.  Or maybe just allow the app implementor to specify a function there?


### Consideration: Refresh Tokens

This one has a bit more weight than the other considerations, just because it's currently not even in the operational outline.

It should occur during the valid session check:
- Does the _Client_ have a valid session?
  - If Yes, continue.
  - If No, does the _Client_ have a _Refresh Token_?
    - If No, continue.
    - If Yes, does requesting a new _Access Token_ succeed?
      - If Yes, jump back to check if the _Client_ has a valid session.
      - If No, continue.
  - If No, is the request for a resource for which we should redirect invalid requests?
    - If Yes:
      - Save the path to the _Target Resource_ on the _Session_.
      - Create a new _State_ on the _Client_'s _Session_.
      - Redirect _Client_ to the _IDP Authorization URL_.
      - NOTE: Another request reaching this branch will invalide a previous one!
    - If No, Respond with 401.

#### Tangent: New Behavior: Check or Try Actions

This suggests a slightly different behavior:
- Given:
  - Check
  - ... Actions
- Do:
  - Loop:
    - Does Check succeed on current context?
      - If Yes, break Loop and continue after.
      - If No:
        - Take head of Actions as Head Action:
          - Is there a Head Action?
            - If No, fail with error "Exhausted actions".
            - If Yes, continue.
        - Call Head Action on current context, with Next as:
          - Recur Loop with Tail of Actions as Actions when Head Action resolves.
            - NOTE: Rejection propagates up as expected.
            - NOTE: An Action could await on Next, but nothing else would be called when the await resolves.
            - NOTE: If Next is not called, the Loop breaks and does _not_ continue after.

There are several salient features here:
- The Loop will fail if the actions exhaust.
  - This means a Failure Action should be provided as the last case.
- The Loop checks before calling the action each time, and after the last action if the last action calls Next.

There are also implied behaviors:
- The Loop will always pass control to the next middleware if the Actions are not exhausted.
  - Does it need to?  I suppose Check can determine if it wants to just Break, or Break and Continue After Loop by whether it calls Next or not?

Some things I'm not too happy with:
- The change in meaning of Next in the Actions context is, well, weird.  I guess it should be named Recur instead of Next.
  - It's just a Name, but at the same time, it's a Name.
- The behavior is pretty specific.
  - General tools are good, but this one seems a bit specific in behavior.  However, it does answer the need I have, control wise.

From that, we should have an interface like this:

```js
const middleware = checkOrTry(checkFn, [
  action1,
  action2,
  ...actions,
])
```

Semantically, the Actions here are, I guess, Rectifications, attempts to perform some sort of corrective action to get Check to pass.  They can try something, try recurring to pass the buck on, then the last Rectification can just give up, acting as a handler, basically, at which point the Loop stops.

In this specific example, I guess we'd have something like this:

```js
const middleware = checkOrTry(isUserSessionValid, [
  tryRefreshingToken,
  createCondMiddleware(
    shouldRedirectInvalidSession,
    redirectForAuthorization,
    denyRequest
  ),
])
```

In the second case, the one using `createCondMiddleware`, neither branch of that calls `next`, they both act as handlers, thus starting unwinding the middleware stack.  On the other hand, `tryRefreshingToken` does call `next`, or `recur` as it were, thus causing `isUserSessionValid` to be called again, and continuing control after the `checkOrTry` middleware if the check passes.

Amusingly, this could be unrolled into the following:

```js
function checkOrTry(checkFn, corrections) {
  function breakAndContinue(ctx, next) {
    return next();
  }

  return createCondMiddleware(
    checkFn,
    breakAndContinue,
    composeMiddleware([
      corrections[0],
      createCondMiddleware(
        checkFn,
        breakAndContinue,
        composeMiddleware([
          corrections[1],
          createCondMiddleware(
            checkFn,
            breakAndContinue,
            // Eventually, we stop with this:
            failWithError,
          )
        ])
      )
    ])
  )
}
```

or,

```js
function breakAndContinue(ctx, next) {
  return next();
}

function failWithError() {
  return Promise.reject(new Error("Exhausted actions"));
}

function checkOrTry(checkFn, corrections) {
  return createCondMiddleware(
    checkFn,
    breakAndContinue,
    (corrections.length
      ? composeMiddleware([
        corrections[0],
        checkOrTry(checkFn, corrections.slice(1)),
      ])
      : failWithError
    )
  );
}

// Or, for lazier evaluation:
function checkOrTry(checkFn, corrections) {
  return $checkOrTry(ctx, next) {
    return createCondMiddleware(
      checkFn,
      breakAndContinue,
      (corrections.length
        ? composeMiddleware([
          corrections[0],
          checkOrTry(checkFn, corrections.slice(1)),
        ])
        : failWithError
      )
    )(ctx, next);
  }
}
```

So, it's not actually that bad to implement, although in this version, outer layers end up being able to await on inner layers... We'd want to at least prevent calling `next()` more than once.  Well, actually, with `composeMiddleware`, we already have that.  Not so much with `createCondMiddleware`, though.  I guess `createCondMiddleware` depends on other things checking that.

How to unroll that, then?  With state tracking, because JS doesn't have tail-call optimization.  I probably won't bother since at most it's three or four cases?
