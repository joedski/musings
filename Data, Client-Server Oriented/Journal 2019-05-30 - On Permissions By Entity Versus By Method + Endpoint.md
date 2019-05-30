---
tags:
    - permissions
    - capabilities
    - remote-data
---

Journal 2019-05-30 - On Permissions By Entity Versus By Method + Endpoint
========

The main reason I prefer Permission by Method + Endpoint is that, ultimately, that's all the Client cares about: Can the User make a request with HTTP Method X to Endpoint Y?

Any permissions-related thing on the client ultimately degrades to "Can User Call This Method" in the given transport mechanism, which on HTTP based APIs basically means "Can Use Call Endpoint with HTTP Method X", and no amount of diddling around with things will get around that.  This means any abstraction on the client will have to eventually allow querying of such method-by-method permissions, since that's what it really needs to know.  The fact that this is governed by some other mechanism in the API internally is irrelevant, and ideally should be kept as irrelevant as possible.

> Aside: While I prefer that, it's not really as important for non-publicly-consumed APIs, which most internal apps are.  Ergo, one could argue that complaining about the API not doing something that's most sensical to the UI is itself irrelevant.  Additionally, not every HTTP-transported API needs to pretend to be a REST API.



## Questions

- [x] Will every entity have permissions declarations on them, including other entities nested within root or more-root level entities in a response?
    - ANSWER: Actually, based on the solution outlined below, this doesn't matter.  They can be arbitrarily placed.  Since I assumed that, I just make the extractor part of the definition.



## On Normalized Extraction of Per-Entity Permissions Declarations

This basically becomes an arbitrarily complex process to abstract around, meaning it's almost worth it to not abstract around it and just say "this property on this interface is a permissions thingy", and then just write functions to transform that into meaningful values.

The downside to that approach is that it becomes more complicated to query permissions from the central state atom: now everything that wants to know a particular permission must not only know what permission they're looking for (which is the expected parametrization) but must also know what entity to look up in order to query that permission (which is extra parametrization).

In the case of the Remote Data Abstraction I'm going to put in place in the UI, it means to query permissions for a given entity, which may be a nested entity in some cases, one must now also know both the root entity and the path to the nested entity.  In simple cases, the root entity is just a collection-container, but in other cases it could be an actual business entity.

This necessarily leads to more coupling between different sections of the UI State, which makes the UI more annoying to develop.

The only way I can think of off hand to decouple things is to create some needlessly complicated automatic-response-walker, but even that would now need to know what each kind of business entity each thing in a response is, and that's not sustainable either.  (okay, not really.)


### On Abstracting Around It Anyway

So, one of my core tenants of development is to _formalize patterns of usage into abstractions_.  If the pattern of usage is that I need to drill down into a parametrized path within a given response blob, then why not just lift those parametric drill-downs into a map?  It's more annoying than just mapping methods+endpoints, but it still composes nicely with the Remote Data abstraction, or any other good, orthogonal abstraction for that matter.

In this case, though, all permissions are going to be themselves gated behind `AsyncData` anyway, so why not just define `AsyncData` mapfns?  Specifically in this case, permission-predicate-mapfn-creators.

I guess it'd end up something like...

```typescript
const canUpdateFoo = canDo(
  (r: SomeResponseDataType, p: { fooId: number }) =>
    ifNotNull(r.foos.find(e => e.id === fooId), foo => foo.permissions),
  'update'
);

fooResp.map(canUpdateFoo).getDataOr(false);
// => boolean... or boolean | null?  with "null" meaning "undefined".
// ... or "undefined" meaning "undefined".  I dunno.
// For now, simple boolean works.
// If you don't know, then the answer is "no",
// and AsyncData handles the "we're still waiting" part.
```

Pretty much.  Really wish we had that bind operator, but nooooooooo.  Or even better the `|>` operator from Reason and like every other language that doesn't hate people.

But nooooooooo.

Also, Pipe + Partial Application for delicious `|> foo(bar, ?)` goodness?  Mmmmmmmmmmmmmmmmmyeeeeeeeeeeeeeeessssssssssssss.  (though `|> (it => foo(bar, it))` is also fine.  The partial application `?` thingy would just be icing on the cake, at the cost of making the JS parser even more of a flaming mess.)

Anyway.

I guess then that the mapping would be defined thusly:

```typescript
// extends { [k: RequestKey]: RequestDefinition }
const requestsMap = {
  getFoo: (p: { fooId: number }) => req('GET', `/foos/${fooId}`),
};

// extends { [k: RequestKey]: PermissionDefinition }
const permissionsMap = {
  getFoo: {
    request: 'getFoo',
    predicate: Boolean,
  }
  deleteBar: {
    request: 'getFoo',
    predicate: canDo(
      (r: IFoo, p: { barId: number }) =>
        r
          .bars
          .find(e => e.id === p.barId)
          |>ifNotNullish(e => e.permissions),
      'DELETE'
    ),
  },
};
```

This is more complicated than just ``deleteFoo: (p) => ['DELETE', `/foos/${p.fooId}`]`` but it's still a map, it just changes the type-definition of `PermissionDefinition`.
