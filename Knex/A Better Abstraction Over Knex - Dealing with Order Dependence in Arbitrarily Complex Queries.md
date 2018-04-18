A Better Abstraction Over Knex: Dealing with Order Dependence in Arbitrarily Complex Queries
============================================================================================

An issue that seems to arise even in Knex is the order of query construction.  It does mitigate things to a degree, but it still has some ideosyncratic behavior if trying to call things out of order.

> TODO: Find some examples.

I wonder if there's some minimal machinery that can be added to reduce or eliminate the dependence on order of method calls entirely?



## Some Ideas

One thought is that a collection can be created that simply holds the kinds of operations in order of addition, then evaluation of the collection to an actual query occurs on `then`.

So `query.select()` would add a `['select', q => q.select(...)]`, `query.from()` would add a `['from', q => q.from(...)]` etc.  Then you do `calls |> groupBy(nth(0)) |> over(map(get, keyOrder)) |> filter(Boolean) |> flatten |> reduce((q, a) => a(q), actualQuery)` and that should do everything up nice and neat.

I don't think this needs much extra checking since Knex already does so much of that itself.

This would be pretty long and arbitrary, but ultimately pretty simple to implement.
