Journal 2021-06-23 - Using the In-Operator When the List May Contain Null
=========================================================================

> Note: This works in more than just Oracle.

We can't just do something like this:

```sql
foo.nullable_column in (:some_list_maybe_containing_null)
```

Because of how the `IN` operator works: `A IN (B, C, D, ...)` is treated the same as `A = B OR A = C OR A = D OR ...`.

If we try to give null for any of these values, that comparison will never be true (and if we give null for A then _none_ of them will be true!) because `X = null` is always false, because `null` in SQL is basically "no defined value".  This is why of course we have the separate `IS NULL` comparison.

Ideally we'd do something like:

```sql
foo.nullable_column in (:some_list_maybe_containing_null)
  or foo.nullable_column is null
```

But how do we determine when to actually try the `is null` condition?  Presumably, if the list given this time does _not_ contain null, we don't actually want that comparison.

By googling for "sql opposite of coalesce", I found an interesting trick: many aggregating functions that accept lists of values and compare those values in some way will propagate a null if any of the values are null.

That means we can do this to check if some list of values contains a null:

```sql
select
  (greatest(:some_list_maybe_containing_null) is null) as LIST_HAS_NULL
from dual;
```

Applying this to the contrived example from the start of this, we get:

```sql
foo.nullable_column in (:some_list_maybe_containing_null)
  or (greatest(:some_list_maybe_containing_null) is null and foo.nullable_column is null)
```
