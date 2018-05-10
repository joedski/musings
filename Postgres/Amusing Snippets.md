Amusing Snippets
================

Variably useful and amusing snippets of Postgres I learned about.



## JSON (Mostly JSONB because it's better)

I mean, okay, JSONB actually means JSON(Binary), but it is actually Better too because Postgres comes with some extra functionality around it that lets you treat your database a little more document-store-ish.  I mean, you shouldn't abandon all schemas, but you can at least store and interact with JSON in a pretty sane way provided you can learn the operators/functions.


### Updating JSON

You can't actually update JSON in place in Postgres.  Fortunately, working with immutable data has made the process here pretty intuitive for me: You simply create a new value based on the old one, then replace the old one.

In Postgres, this is done with `jsonb_set(old::jsonb, path::text[], new::jsonb, create_path::boolean = TRUE)`.  It's use is pretty easy, though takes a little bit of practice:

```sql
UPDATE "foo"
SET "attributes" = jsonb_set(
  "attributes",
  '{thingy}',
  '"very thingish"'::jsonb
)
;
```



## Inline/Constant Tables Using VALUES

- [Postgres (9.5) docs on `VALUES`](https://www.postgresql.org/docs/9.5/static/queries-values.html)

From there we see you can do things like this:

```sql
VALUES (1, 'one'), (2, 'two'), (3, 'three');
```

If we then want to use it, we can use it like this:

```sql
SELECT *
FROM (VALUES
  (1, 'one'),
  (2, 'two'),
  (3, 'three')
) AS "anon_table"
;
```

Postgres seems to give the columns the automatic names `column1` for the first one and `column2` for the second.  Can we get more useful names?  It seems we can doing something like this:

```sql
SELECT "foo", "bar"
FROM (VALUES
  (1, 'one'),
  (2, 'two'),
  (3, 'three')
) AS "anon_table" ("foo", "bar")
;
```

Can we do this in a `WITH` clause for even more readability and multiple referencing?  Yes, but remember to flip everything across the `AS` at the top:

```sql
-- NOTE: The table name AND the column names come before the AS here!
WITH "anon_table" ("foo", "bar") AS (VALUES
  (1, 'one'),
  (2, 'two'),
  (3, 'three')
)
SELECT "foo", "bar"
FROM "anon_table"
;
```

Armed with this, we can then create better one-off bulk update queries.

```sql
WITH "anon_table" ("foo", "bar") AS (VALUES
  (1, 'one'),
  (2, 'two'),
  (3, 'three')
)
UPDATE "real_table"
SET "bar" = (
  SELECT "anon_table"."bar"
  FROM "anon_table"
  -- Since this is an UPDATE, we're dealing with a single "real_table" row at a time,
  -- so we can just do a direct equality check to narrow down "anon_table"
  WHERE "anon_table"."foo" = "real_table"."foo"
  -- Could also add LIMIT 1 for extra safety.
)
-- Conversely, out here we're dealing with the whole "real_table".
WHERE "real_table"."foo" IN (SELECT "foo" FROM "anon_table")
;
```

If we wanted to assign a default value to some field for everything else, we could do something like this instead:

```sql
WITH "anon_table" ("foo", "bar") AS (VALUES
  (1, 'one'),
  (2, 'two'),
  (3, 'three')
)
UPDATE "real_table"
SET "bar" = (
  -- Use coalesce() to set a value in case of NULLs.
  SELECT coalesce("anon_table"."bar", 'no value')
  FROM "anon_table"
  WHERE "anon_table"."foo" = "real_table"."foo"
)
-- NOTE: No WHERE clause here, we're touching all of "real_table".
;
```
