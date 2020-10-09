Journal 2020-09-23 - Vue-Router, Routes, Per-Route Stores Exploration
========

We're using Vue-Router in an app and would like to implement per-route stores or caches of information, mostly form state and some request response caching, so that the user can hit back and continue where they left off.

Specifically, we'd like the following behavior:

- When a user goes "forward" to a given search, they'll see a fresh form and the first page of results.
- The user then can enter search filters and see results, paging through them.  Multiple pages may be loaded from the server if their criteria are too loose.
- When a user goes "forward" to a found item, then goes "back" to the search, they should see the same form values, the same page, and the same results they saw last time.
- However, if they go to the top of the application then go "forward" again to the search, they should again see a fresh form and the first page of results.

As a note, our search results should be relatively stable as our data is not expected to change nearly so often.



## Using Route Meta?

I thought about using route metadata, `route.meta`, but [it seems that this meta is effectively the meta value of the route definition](./vue-router-route-uid/attempt-00/index.html).  That's not very useful.

```js
router.beforeEach((to, from, next) => {
  console.log(
    'router.beforeEach(): meta.uid:',
    to.meta.uid,
    '<-',
    from.meta.uid
  );

  if (
    to.meta && (
      to.meta.uid == null
    )
  ) {
    to.meta.uid = nextUid();
  }

  next();
});
```

Here's what happens during each transition:

- Starting at Home...
- Click "Go to page foo 1234!", we see "undefined <- undefined".
- Click "Go to page foo 1235!", we see "undefined <- route-0".
- Click "Go to page foo 1236!", we see "route-1 <- route-1".
- Click "Back", we see "route-1 <- route-1".
- Click "Back", we see "route-0 <- route-1".
- Click "Go to page foo 1234!", we see "route-1 <- route-0".
- Click "Go to home!", we see "route-0 <- route-1".

So, yeah, not doing what I want...



## How About the Route Objects Themselves?

What if we [stick each route in a Set and check if it's there later](./vue-router-route-uid/attempt-01/index.html)?

```js
const routesSeen = new Set();

// Event when using $router.back(), this will always log
// "router.beforeEach: We have not seen this route yet...", so this
// is basically just a very slow memory leak.  Alrighty then.
router.beforeEach((to, from, next) => {
  if (routesSeen.has(to)) {
    console.log('router.beforeEach: We have seen this route!');
  }
  else {
    console.log('router.beforeEach: We have not seen this route yet...');
    routesSeen.add(to);
  }

  next();
});
```

So, yeah, also not what I want.  Hmmm.



## Where To Go From There?

Dunno.  This is extremely irritating, because it means I either need to reimplement some sort of history stack tracking, whether via wrapping/overriding the methods on VueRouter or ... something more exotic (hacky).

The funny thing is, the form values thing is something that most modern browsers do automatically for plain ol' websites.  SPAs have to just hope whatever router they're using supports that use case.

The annoying thing is there's obviously a stack somewhere in there because you can just tell the router `$router.go(-2)` and it'll dutifully pop 2 items off the stack and put you at whatever's left on top.  Given it's (ostensibly) using the History API and that that also doesn't give you access to the stack, I'm guessing VueRouter's limitation is based on that limitation.

Which is irritating, because it could implement something in there by tracking all the varous history manipulation calls and saving those as part of the router state that gets pushed... but doesn't.


### Just Use a Query Param: Search ID

The cheapest and most universal solution is to just tack on a query parameter.  Ugly, but effective.

So, we could just say `?searchId=some-random-id-here` and use that as our storage key.

Pros:

- Easy to pass around between routes... so long as they remember to do it.
- Explicit part of the API, without any tight coupling.

Cons:

- Not generalized across computers or users.
    - That is, you can't copy/paste it to someone else and they can see it.
    - This is for the most part not really a big deal, but the fact that it shows up in the URL implies it's bookmarkable.
- Have to either forward it across routes that want to remember a given search, or remember to use a back button.
    - And then you have to remember to go back enough times to actually hit the correct history entry.


### Simple Form Params: Sync Values to the Query

The other option is to just keep the form state in the route query, but of course this only works if your form state is relatively small.

This can't really be used to cache search results, though it could theoretically be used to build a search results cache key for a manual solution.  Hm.

The main issue here I think would be the implementation detail of eagerly deleting the old KV entry when ever the Key changes.

As for creating the key... Technically, [object properties are unstable in JS (S.O Answer)](https://stackoverflow.com/a/30919039/4084010), though [no modern browser actually has an unstable order (Comment on that S.O. Answer)](https://stackoverflow.com/questions/30076219/does-es6-introduce-a-well-defined-order-of-enumeration-for-object-properties#comment81132251_30919039).

Because of that, we could just take the current `$route.query` and `JSON.stringify` it, use that as the key.  In fact, the key itself might be Route Name + Route Params + Route Query.  The latter two could be empty objects, but should still be present.

It could be anything, granted, it depends on the exact situation.  In this case, we might forward the search params around just to be able to return to the search later, then key off those search params for the transient cache.

The component itself could then make use of a cache that only has 1 real key, and just invalidates that entry if the "last key" inside the entry differs from the next, or if the next key is blank.


### More Magical/Opaque: Internal Key

Basically, use an internal key and forward that, rather than forwarding the whole form state.  This key could be forwarded on the query params, or could just be a fixed constant per form.

There's two ways to use this:

1. Used as a query param, the form state would be saved to an internal cache keyed by the given query param, and that query param is forwarded across routes.  From there, 1 of 2 things could happen:
    1. The form uses the key to re-initialize state
        1. Returning to the form route with the query param would retrieve the form state.  Without the query param, it would assume a fresh state.
        2. In this case, all any other route would see is the form cache key, not the form state itself.
        3. This is opaque to other routes, more maintainable due to lower coupling
    2. The from-route component uses the cache key to retrieve the form state and apply that.
        1. This is not opaque to other routes, but means the form is constrained by the query params, which makes the coupling between routes slightly tighter.
            2. Though, given that routes should just splat the query params in, that's probably not too much of a concern.
2. Using a fixed constant per form, any route that wants to go back to the form would use the given form's key (probably the route name, honestly) and check if there's any query params at the given cache entry.
    1. If so, those query params would be added as part of navigation to the form route.  Otherwise, no query params are added as part of navigation and the form is rendered with a clean state.
