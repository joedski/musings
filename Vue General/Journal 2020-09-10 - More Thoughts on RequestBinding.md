Journal 2020-09-10 - More Thoughts on RequestBinding
========

I think that the current version of RequestBinding is pretty good, but there are still aspects of it that could be better, and some things that I don't know if they could be better or not but maybe?



## Expose Response

The Response itself is very useful for one key reason: it includes the original request config along side the response data.  Thus, you know what request config was used to get that data.

This is useful for reacting to changes in the request state.

In any implementation of RequestsModule I've done, I've always stored the request state as an `AsyncData<Response, Error>`, so this would be closer to what's used internally.

In fact, it may be better to just use `data` as a derived prop from `response`.



## Expose RefreshableData Props Directly From RequestBinding Instance

This one is pretty self explanatory: mirror/expose the RefreshableData props directly on the RequestBinding instance so that we don't have to type `fooRequest.refreshableData.lastData` every time.  It should be pretty well understood what's going in.

> I suppose in this case we'd stick to Data since in the vast majority of cases, that's what we want.  This is to say, Data/RefreshableData as opposed to Response/RefreshableResponse.



## Dealing With Incompletely Parametrized Requests: Maybe We Should Parametrize Dispatch?

This has been a persistently annoying issue: we cannot create a request config if required parameters are missing, but what do we do in such a case?

Currently the answer is to make such requests nullable, but as nullability always does, that complicates handling internally.

Here's one thought:

- Requests that have required params should be always manually dispatched.
- The request creator always returns a request, never null.
- The request creator may declare some arguments, which are in turn required by `RequestBinding.dispatch()`.

The issue with doing this is it all but requires we not allow auto-dispatch, because if we always need params for the request creator to create a request, then we always need to pass them in.  Passing them in when calling `dispatch()` is currently the only way to do that.  If we wanted to just have them tacitly known, we'd just create a `data` prop on the component to hold those params and then the request creator wouldn't need them anyway, since it would just compute the request from the component `data`.

I suppose one way to do this is to have Reads require no params and always auto-dispatch, and Mutations allow params but never auto-dispatch.



## Always Auto-Dispatch or Always Manual Dispatch?

This has also been something I've been going back and forth on.  Currently there's sometimes-auto dispatch, which is for "safe" requests on RequestBinding initialization.

Sometimes-sorta-automatic behavior is suboptimal, at least when it's the default.

Instead, it should either be Always-Auto or Always-Manual, unless explicitly specified otherwise.

> Obviously "unsafe" operations should never be automatic by default, but it can be highly ergonomic for "safe" operations to be automatic by default.

The primary idea of always-auto is to bring things closer to the tacit-dispatch style of a purely-reactive system: Events occur, are transformed automatically into requests, and those requests are automatically dispatched.

Part of the issue is that Vue is pragmatic and semi-imperative.  The mutation-oriented reactivity system is enough to show that.

Requests are usually derived from data, props, ambient environment (`$route` most commonly), but by having things implicitly dispatch we conflate that derived data (the request config) with the event that causes the dispatch.

Now, on balance, for things like search filters, this is almost always what you want, but it can be a bit hard to wrap your head around.  It could also be taken as encouraging placing such a filter form in a separate component that only emits when the search is changed/submitted rather than every single form state change.

The thing is that it's still implicit looking.  You pass in a function and stuff happens behind your back.

The other side of this is that it's really, really annoying and perhaps even redundant to always specify when a request is `dispatch()`ed.  When this happens on click it's usually considered fine, but on component initialization it grows tiring.

But this also goes back to the dichotomy between "safe" and "unsafe" operations, and how the automatic behavior always happens with "safe" and never with "unsafe".

Perhaps what we need is `ReadRequestBinding` and `MutationRequestBinding`?  That might be too much for configuring what's really a single option, though it would certainly put it front and center as well as obviate the need to do any "safe"/"unsafe" determination: even if the request is a POST it still gets auto-dispatched if it's used with a `ReadRequestBinding`.


### Auto-Dispatch and Nullable Requests

Nullable requests is another sticking point with auto-vs-manual: they're just fine with auto requests as they just dispatch at the first availability.  With manual, though, you (currently) get an error because you cannot dispatch a null request.

Manual basically requires either throwing an error (surprising, but usually indicative of missing data) or having parametric dispatch.  I'm starting to think in that case parametric dispatch is better, just on the basis that it doesn't force you to backtrack through your request creator to determine just what's missing.


### Alternative: Wrap the Request Config or Factories

Instead of creating subclasses, this would be reusing basic behavior built into the Request Bindings themselves, and just parametrizing that behavior on the Request Config.  Prefab behaviors, if you will.

The main issue here is that to compose behavior, we have to either apply it to the request itself or to the request creator.  In either case, we have either hard-composed calls or use of a "compose" or "pipe" function.

```
() => readRequest(getFooBar({
  fooId: this.$route.fooId,
  barType: this.form.barType,
}));

() => mutationRequest(putUpdateFoo({
  fooId: this.$route.fooId,
  body: {
    // ...
  }
}));
```

Of course, the difference here and there is that MutationRequestBinding could require extra parameters on `dispatch` while this wouldn't, since `dispatch` is already pre-set to no parameters.



## Allow Specifying an AsyncData Transform on the RequestBinding?

Currently, no parts of the request chain allow you to specify a transform of the requseted data. (Technically you can via Axios options but shhhhh)  This is intentional.

However, that includes _at the point of use with the RequestBinding_, which can be annoying since the RequestBinding is what the component itself uses, and therefore it's fine to specify a data transform there.  Without being able to specify it at the `RequestBinding`, the Component must now apply the same transform to multiple different props separately.

So, why not at the `RequestBinding`, then?

The question of course is how.
