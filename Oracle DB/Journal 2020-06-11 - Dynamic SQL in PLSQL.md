Journal 2020-06-11 - Dynamic SQL in PL/SQL
========

Going through the material [here](https://docs.oracle.com/cd/B28359_01/appdev.111/b28370/dynamic.htm#i13057).

Basically, I want to build a string and execute that so I can be lazy, with the disadvantage that it can mean runtime errors, as `eval` always can.

There's two basic forms:

1. `EXECUTE IMMEDIATE` statements.
2. `OPEN FOR` + `FETCH INTO` + `CLOSE` statements.



## Execute Immediate

There's quite a number of variations to `EXECUTE IMMEDIATE` due to how you can combine the various things supported around it.


### General: Bind Arguments for Execute Immediate

There's a few ways bind arguments are specified, which are variously used depending on the SQL being executed.

- `USING` Clause, used for `IN` args except for SQL which is a Block or Call statement, in which case it is used for `IN`/`OUT` args.  Just be sure to explicitly notate which ones are `OUT` or `IN OUT`.
- `INTO` Clause with out-arg(s?), used only for a `SELECT` which is expected to return at most 1 row.
- `BULK COLLECT INTO` Clause with an out-arg, used for a `SELECT` which can return 1 or more rows.
- `RETURNING INTO` Clause with out-arg(s?), used for any DML statements with a `RETURNING` clause.


### Bind Arguments and Null

As a quick note, they point out that you cannot specify `NULL` directly for a bind argument, instead you have to create an extra variable in your block's `DECLARE` section and not initialize it, and use that variable.

You could explicitly initialize it to `NULL` if you want, but you don't need to.


### Selecting One Row

```sql
EXECUTE IMMEDIATE
  'SELECT * FROM MY_SCHEMA.USERS WHERE COMPANY_ID = :id AND REV = :rev'
INTO user_record
USING user_company_id, user_rev
;
```
