Amusing Snippets
================

Variably useful and amusing snippets of Postgres I learned about.  Some may even be applicable to MySQL.



## JSON (Mostly JSONB because it's better)

I mean, okay, JSONB actually means JSON(Binary), but it is actually Better too because Postgres comes with some extra functionality around it that lets you treat your database a little more document-store-ish.  I mean, you shouldn't abandon all schemas, but you can at least store and interact with JSON in a pretty sane way provided you can learn the operators/functions.


### Updating JSONB

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

Though using `ARRAY[]` notation might be less confusing:

```sql
UPDATE "foo"
SET "attributes" = jsonb_set(
  "attributes",
  ARRAY['thingy'],
  '"very thingish"'::jsonb
)
;
```


### Deleting Fields from JSONB

The `-` operator creates a new JSONB from the JSONB on the left by omitting the field name on the right from the source JSONB.  So, `'{"foo":"FOO","bar":"BAR"}'::jsonb - 'bar'` yields `'{"foo":"FOO"}'`.  This can be chained like numeric subtraction to remove multiple fields.  Alternatively, you can also just do `someJsonbColumn - ARRAY['foo', 'bar']` to omit multiple fields.

A targeted removal of a single prop might look something like this:

```sql
UPDATE target_table
SET some_jsonb_column = some_jsonb_column - 'foo'
WHERE some_jsonb_column ? 'foo'
;
```

While a targeted removal of many props might look something like this:

```sql
UPDATE target_table
SET some_jsonb_column = some_jsonb_column - ARRAY['foo', 'bar', 'otherProp']
WHERE some_jsonb_column ?| ARRAY['foo', 'bar', 'otherProp']
;
```

Where the `?|` operator checks if any of the field names in the Text Array on the right exist on the JSONB on the left.  `?&` is similar, but checks if _all_ the field names are present.

I don't know if the `WHERE` clause here actually makes things faster or not, but usually updates are slower than selects, so probably?  I'd have to actually test.



## Inline/Constant Tables Using VALUES

- [Postgres (9.5) docs on `VALUES`](https://www.postgresql.org/docs/9.5/static/queries-values.html)
- [Answer showing an example and pointing to (and excerpting from) the manual](https://stackoverflow.com/a/17533194/4084010)

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


### Combining VALUES with Explict Types

As an interesting note, since these are columns, they do need to be the same type.  Fortunately, you only need to specify types on the first row, and Postgres will try to treat the rest of the values in that column as that same type.

Here's a couple of examples with `jsonb`, which is always entered as a string of course.

```sql
WITH "foo" ("id", "attrs") AS (
	VALUES
	(1, '{"thingy": 23}'::jsonb),
	(2, '{"thingy": 100}'),
  -- Does not have the prop "thingy" so instead of a number we get NULL.
	(3, '{"noThingy": true}')
)
SELECT ("attrs"->>'thingy')::int AS "thingy"
FROM "foo"
;

WITH "anon_table" ("foo", "bar") AS (VALUES
    -- NOTE: Type specified only for the first row!
    (1, '1'::jsonb),
    (2, '2'),
    (3, '3')
)
UPDATE "real_table"
SET "bar" = jsonb_set(
    "real_table"."bar",
    '{sameValue}',
    (
        SELECT "anon_table"."bar"
        FROM "anon_table"
        WHERE "anon_table"."foo" = "real_table"."foo"
    )
)
WHERE "real_table"."foo" IN (SELECT "foo" FROM "anon_table")
;
```

Of course, trying to break this causes an error:

```sql
WITH "foo" ("id", "attrs") AS (
	VALUES
	(1, '{"thingy": 23}'::jsonb),
	(2, 25),
	(3, '{"noThingy": true}')
)
SELECT ("attrs"->>'thingy')::int AS "thingy"
FROM "foo"
;

-- Result:
-- ERROR:  VALUES types jsonb and integer cannot be matched
-- LINE 4:  (2, 25),
--              ^
```



## `WITH RECURSIVE`

These are examples pulled from the documentatino on `WITH` clauses, just as a quick summary and some personal notes.

Here's a simple example that generates a sequence of numbers from 1 to 10:

```sql
WITH RECURSIVE foo (value) AS (
    VALUES
        (1)
    UNION ALL
        SELECT value + 1 AS value
        FROM foo
        WHERE value < 10
)
SELECT *
FROM foo
;
```

> NOTE: I tried running this both with `UNION ALL` and just `UNION` and it returned the same result.  Not sure if `UNION ALL` is necessary here.

> NOTE: `UNION` discards duplicates, but `UNION ALL` retains them.


### Tree Structures

Naturally, `WITH RECURSIVE` can be used for tree structures, too.

Suppose we have `some_tree (id, parent_id)`:

```sql
CREATE TABLE IF NOT EXISTS some_tree (
    id SERIAL PRIMARY KEY,
    -- For now, delete children of deleted parents
    parent_id integer REFERENCES some_tree (id) ON DELETE CASCADE
);
```

And let's fill it with some test data:

```sql
INSERT INTO some_tree (parent_id)
VALUES
    (NULL),
    (NULL),
    (NULL),
    (1),
    (2),
    (4),
    (1),
    (4),
    (2),
    (6),
    (7)
;
```

We could get a child and all its ancestors like so:

```sql
-- In psql, you can test it like this:
-- insert into some_tree (parent_id) values (null), (null), (1), (2), (4);
-- \set id 6
WITH RECURSIVE node_and_ancestors (id, parent_id, depth) AS (
    -- Initial selection: The target node.
    SELECT id, parent_id, 0 AS depth
        FROM some_tree
        -- use `\set id 6` for instance.
        WHERE id = :id
    UNION
        SELECT some_tree.id, some_tree.parent_id, depth - 1 AS depth
        FROM node_and_ancestors
        JOIN some_tree ON some_tree.id = node_and_ancestors.parent_id
)
SELECT *
FROM node_and_ancestors
;
```

- We start by selecting the target node, which in the above snippet takes advantage the `psql` tool's ability to reference defined variables with a colon.
    - As noted, these can be set using `\set id 6`.
- Then, we start joining `some_tree` where `id`s in there equal the `parent_id`s of rows in the current `node_and_ancestors` selection.
    - This iterates until there's no more things to select, which in this case means when `parent_id` is `NULL`.
- Finally, just spit all those out.

Similarly, we can get all descendants:

```sql
-- use `\set id 1` for instance.
WITH RECURSIVE node_and_descendants (id, parent_id, depth) AS (
    SELECT id, parent_id, 0 AS depth
        FROM some_tree
        WHERE id = :id
    UNION
        SELECT some_tree.id, some_tree.parent_id, depth + 1 AS depth
        FROM node_and_descendants
        JOIN some_tree ON some_tree.parent_id = node_and_descendants.id
)
SELECT *
FROM node_and_descendants
;
```

Notice how this does a bredth-first search, which makes sense since we go by parent rather than by branch.

We can even combine these two if we want, just for funsies:

```sql
-- Use `\set id 4` for example...
-- Need the node itself to get node.parent_id
WITH RECURSIVE node_and_ancestors (id, parent_id, depth) AS (
    SELECT id, parent_id, 0 AS depth
        FROM some_tree
        WHERE id = :id
    UNION
        SELECT some_tree.id, some_tree.parent_id, depth - 1 AS depth
        FROM node_and_ancestors
        JOIN some_tree ON some_tree.id = node_and_ancestors.parent_id
),
node_descendants (id, parent_id, depth) AS (
    SELECT id, parent_id, 1 AS depth
        FROM some_tree
        WHERE parent_id = :id
    UNION
        SELECT some_tree.id, some_tree.parent_id, depth + 1 AS depth
        FROM node_descendants
        JOIN some_tree ON some_tree.parent_id = node_descendants.id
)
SELECT node_and_ancestors.id, node_and_ancestors.parent_id, node_and_ancestors.depth
FROM node_and_ancestors
UNION
SELECT node_descendants.id, node_descendants.parent_id, node_descendants.depth
FROM node_descendants
;
```

> NOTE: `UNION` is part of the `SELECT` portion, and the `WITH` clauses apply to the query as a whole.

This same sort of iterative methodology can be used for graph type structures, too, though you may have to `JOIN` on an edges table or something, depending on the setup.  Good times.



## Multiple Operations via `WITH` Clauses

Another interesting thing noted in the Postgres docs is that you can use `WITH` clauses to perform multiple mutations on data.  Their example of "moving" records:

```sql
WITH moved_rows AS (
    DELETE FROM products
    WHERE
        "date" >= '2010-10-01' AND
        "date" < '2010-11-01'
    RETURNING *
)
INSERT INTO products_log
SELECT * FROM moved_rows
;
```

Note the `RETURNING *`, which is necessary since, ordinarily, `DELETE` doesn't return anything!  This tells Postgres to return the records that were selected for deletion, loading them into the `moved_rows` temporary table, and thus letting the `SELECT` query pull them back out for the `INSERT`.

`RETURNING` is a feature in Postgres, but not every RDBMS.  As a frill, it's most certainly not in the light weight `sqlite`.
