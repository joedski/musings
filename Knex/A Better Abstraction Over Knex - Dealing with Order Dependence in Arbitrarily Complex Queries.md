A Better Abstraction Over Knex: Dealing with Order Dependence in Arbitrarily Complex Queries
============================================================================================

> NOTE: While I'd like less order dependence, and a more functional interface like proposed here, a lot can be accomplished by using `QueryBuilder#modify(fn, ...fnArgs)`.

An issue that seems to arise even in Knex is the order of query construction.  It does mitigate things to a degree, but it still has some ideosyncratic behavior if trying to call things out of order.

> TODO: Find some examples.

I wonder if there's some minimal machinery that can be added to reduce or eliminate the dependence on order of method calls entirely?



## Some Ideas

One thought is that a collection can be created that simply holds the kinds of operations in order of addition, then evaluation of the collection to an actual query occurs on `then`.

So `query.select()` would add a `['select', q => q.select(...)]`, `query.from()` would add a `['from', q => q.from(...)]` etc.  Then you do ...

```
keyOrder = ['where', 'select', 'from', 'join', ...]
orderedKeyGetters = map(get, keyOrder)

applyCalls = queuedCalls =>
  queuedCalls
    |> groupBy(nth(0))
    |> over(orderedKeyGetters)
    |> filter(Boolean)
    |> flatten
    |> reduce((q, a) => a(q), actualQuery)
```

I don't think this needs much extra checking since Knex already does so much of that itself.  It's basically just a wrapper utility around the stuff knex already does, it just enforces a standard order, which is "each call grouped by type and run in order of addition".  Things like calling `from` twice would probably only get an error from Knex itself, though, rather than this.  I mean, we could check it, but I'm not sure if we need to?

This would be pretty long and arbitrary, or at least the list of methods would be since knex's own method list is quite long, but ultimately pretty simple to implement.
