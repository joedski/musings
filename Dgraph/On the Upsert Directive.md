On the \@upsert Directive
=========================

1. [Docs on the \@upsert Directive][ss-1]
2. [An analysis on Dgraph 1.0.2 by Jepsen's Kyle Kingsbury][ss-2]
  1. Very in depth, actually shows some bad cases.  Need to read through this more fully.
  2. Note that as of writing, (2018-10-12) Dgraph is at 1.0.8.
  3. [Section 3.3: Duplicate Upserts][ss-2-3]
  4. Also, interestingly, their test cases are available as Clojure files.

The [docs themselves][ss-1] don't really say much, giving a very Microsoftean definition: "Predicates can specify the `@upsert` directive if you want to do upsert operations against it. If the `@upsert` directive is specified then the index key for the predicate would be checked for conflict while committing a transaction, which would allow upserts."

To see what actually was going on here, I had to search around.  After finding some unhelpful forum posts, I finally found a lengthier explanation in [a detailed analysis of Dgraph][ss-2].  Relative to RDBMSs, specifing the schema of an edge is like specifying a column as a unique key, in this case indexed by however you, well, index it.  Supposing nodes must have unique emails, you might say `email: string @index(exact) @upsert .`, which specifies that the edge `<email>` is `@index`ed by `exact` value, and that this value must be checked for conflicts when inserts are occurring:

> However, 1.0.4 weakened the default safety semantics: for performance, indices are no longer checked for conflicts by default, which means that upserts are still (by default) unsafe. _Instead, one must add a new index directive, `@upsert`, on any indices used for upserts. This informs Dgraph that those indices should be checked for conflicts._ With the appropriate `@upsert` directives, upserts worked correctly.
>
> _[3.3: Duplicate Upserts][ss-2-3]_



[ss-1]: https://docs.dgraph.io/query-language/#upsert-directive
[ss-2]: https://jepsen.io/analyses/dgraph-1-0-2
[ss-2-3]: https://jepsen.io/analyses/dgraph-1-0-2#duplicate-upserts
