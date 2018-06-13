Full Text Search and Symbols in Postgres
========================================

In one of my work projects, we have a textual search powered by Postgres.  An issue has recently come up, though: We have tags, but some of those tags have special characters in them, such as ` ` and `&`, and searching for these tags does not surface the so-tagged items.

I think this will (may?) involve two parts:
- Allow tags to be represented literally rather than (just?) as normal document texts broken into lexemes.
- Allow (require?) user search queries to be treated literally so that they will match literal tag values.
  - The only issue with having only literal search is that it can miss things like "policy"/"policies".

Some initial research:
1. [Quoting special characters in double-quotes (within the single-quotes) to keep them grouped together in a Text Search Query][rs-1]
  1. Also includes a note about `plainto_tsquery` for just converting the input text as is to a query.
2. [Question about special characters in TSQueries, especially `&`][rs-2]
3. [Postgres documentation (v9.6) on data types relevant to text search][rs-3]
4. [Postgres documentation (v9.6) on functions and operators relevant to text search][rs-4]
5. [Chapter 12 of the Documentation: Text Search][rs-5]
6. [Section of Chapter 12 Intro talking about configurations][rs-6]



## Actual Search Index

Before going much further, I should also do some preliminary discovery on our existing code base, since I didn't write the text search part at all.


### Existing Search Index

We created the search index as a separate materialized view because it pulled data from a few different source tables.  Basically a whole bunch of this:

```sql
CREATE MATERIALIZED VIEW application_search_index AS (
    SELECT
      id,
      to_tsvector(item.name::text) AS "search_text",
      item.name::text AS "raw_text",
      500 AS "weight",
      'Title' as "source"
    FROM "catalog_item" as "item"
  UNION
    SELECT
      id,
      to_tsvector(item.short_description::text) || to_tsvector(item.description::text) AS "search_text",
      item.short_description::text || ' ' || item.description::text AS "raw_text",
      10 AS "weight",
      'Description' as "source"
    FROM "catalog_item" as "item"
  UNION
    SELECT
      catalog_item_id AS id,
      to_tsvector(t.tag::text) AS "search_text",
      t.tag::text AS "raw_text",
      10 AS "weight",
      'Tags' as "source"
    FROM "catalog_item_tag" as "t"
  -- ... A bunch of more selects unioned together...
) WITH DATA;
```


### Querying the Search Index

Next, it may be helpful to know what we do to actually perform the search against our index using the user's search text.

Looks like we prepare it like this:

```js
function prepFTSQuery(term) {
  const formattedQuery = term
    .replace(/&/g, '')
    .trim()
    .split(' ')
    .join('&');
  return formattedQuery;
}
```

We also separately prep the query by sticking it between `%`s and using `ILIKE` for matching partial-terms in item titles.

One thing that confused me about the way the current query was written was that we had `query @@ "item_search_index"."search_text"`, where the former is a `tsquery` while the latter is a `tsvector`, but the Postgres docs say `@@` takes the `tsvector` on the left and the `tsquery` on the right.

Trying this out in the postgres command line, though, I see both orders seem to work?

```
postgres=# select to_tsvector('fat cats ate rats') @@ to_tsquery('cat & rat');
 ?column?
----------
 t
(1 row)

postgres=# select to_tsquery('cat & rat') @@ to_tsvector('fat cats ate rats');
 ?column?
----------
 t
(1 row)
```

Weird.

Anyway, part of this query is separate handling for partial matches of the literal search text in the titles of items.

```js
function doSourceSearch(query) {
  // ...
  const likeMatch = `%${query}%`;

  return knex
  .with('search_matches', function unionFTSAndPartialMatches(withClause) {
    return withClause.select(...)
    .union(function addPartialTitleMatches() {
      // Now Append to our results any partial-title matches
      this.select(
        'catalog_item_id',
        'source',
        db.pg.raw('50 AS "weight"')
      )
      .from('catalog_item_search_index')
      .where('source', '=', 'Title').andWhere('raw_text', 'ilike', likeMatch);
    });
  })
  .etc(...)
  ;
}
```

So we could probably just do that for tags without trying to finagle literal strings into `tsvectors`.  Too bad I already spent time researching how to do that...  On the plus side, I did _not_ get to trying to figure out how to finagle the `tsquery`, so that's some time saved.

```js
function doSourceSearch(query) {
  // ...
  const likeMatch = `%${query}%`;

  return knex
  .with('search_matches', function unionFTSAndPartialMatches(withClause) {
    return withClause.select(...)
    .union(function addPartialTitleMatches() {
      // ...
    })
    .union(function addLiteralTagMatches() {
      this.select(
        'catalog_item_id',
        'source',
        'weight'
      )
      .from('catalog_item_search_index')
      .where('source', '=', 'Tags')
      .where('raw_text', 'ilike', likeMatch)
      ;
    })
    ;
  })
  .etc(...)
  ;
}
```



## Indexing on (Mostly) Literal Tags

> NOTE: Mostly pointless as I'm just going to use the same strategy as the partial title matches shown above.

I think one part of this

So from [item 4][rs-4] we can see the signature for `to_tsvector` is:

```
to_tsvector([ config regconfig , ] document text)
```

What's `regconfig`?  Guess I'll have to look at the [chapter on text search][rs-5].  Not much actually shown there, and the ToC doesn't seem to give me much, either.  However, the [short blurb on configurations in the intro section][rs-6] seems to indicate I should be able to see the available ones by entering `\dF` into `psql`.  What's the local one say, keeping in mind the remote maaay have different configurations?

```
postgres=# \dF
               List of text search configurations
   Schema   |    Name    |              Description
------------+------------+---------------------------------------
 pg_catalog | danish     | configuration for danish language
 pg_catalog | dutch      | configuration for dutch language
 pg_catalog | english    | configuration for english language
 pg_catalog | finnish    | configuration for finnish language
 pg_catalog | french     | configuration for french language
 pg_catalog | german     | configuration for german language
 pg_catalog | hungarian  | configuration for hungarian language
 pg_catalog | italian    | configuration for italian language
 pg_catalog | norwegian  | configuration for norwegian language
 pg_catalog | portuguese | configuration for portuguese language
 pg_catalog | romanian   | configuration for romanian language
 pg_catalog | russian    | configuration for russian language
 pg_catalog | simple     | simple configuration
 pg_catalog | spanish    | configuration for spanish language
 pg_catalog | swedish    | configuration for swedish language
 pg_catalog | turkish    | configuration for turkish language
(16 rows)
```

Maybe the `simple` configuration is what we want?  Can we find any details on that?  Not really, I'd probably have google for that.

Okay, maybe some empirical testing?

```
postgres=# select * from to_tsvector('a&b');
 to_tsvector
-------------
 'b':2
(1 row)

postgres=# select * from to_tsvector('simple', 'a&b');
 to_tsvector
-------------
 'a':1 'b':2
(1 row)
```

Hm, that still splits on `&`.  Probably spaces, too?

```
postgres=# select * from to_tsvector('simple', 'a b');
 to_tsvector
-------------
 'a':1 'b':2
(1 row)
```

Yep.  Okay, how to create a sensical literal?  Looking back at the [datatype docs][rs-3], it's probably just as simple as sticking stuff in a string?  Hm.

```sql
-- Basic use.
SELECT 'a fat cat sat on a mat and ate a fat rat'::tsvector;
-- Double $'s to avoid excessive escaping of quotes.
SELECT $$the lexeme '    ' contains spaces$$::tsvector;
-- Doubled up single quote inside to escape it.
SELECT $$the lexeme 'Joe''s' contains a quote$$::tsvector;
-- Added positions.
SELECT 'a:1 fat:2 cat:3 sat:4 on:5 a:6 mat:7 and:8 ate:9 a:10 fat:11 rat:12'::tsvector;
-- Positions with weights.
SELECT 'a:1A fat:2B,4C cat:5D'::tsvector;
```

Hm.  That still counts spaces as delimiters.  Indeed, if I do this:

```sql
-- item_tag is an item<->tag many-to-many table.
select (tag)::tsvector from item_tag;
```

I get things like this:

```
'Analytics'
'Removals'
'$/AA'
'Bulletin' 'Service'
```

while using `to_tsvector`...

```sql
-- item_tag is an item<->tag many-to-many table.
select to_tsvector('simple', tag) from item_tag;
```

I get things like this:

```
'analytics'
'removals'
'/aa'
'bulletin':1 'service':2
```

And using the default configuration (`english`)...

```sql
-- item_tag is an item<->tag many-to-many table.
select to_tsvector(tag) from item_tag;
```

I get things like this:

```
'analyt'
'remov'
'/aa'
'bulletin':1 'servic':2
```

So, what I might want to do is to keep the current way tags are handled, but also add to it the tag (more or less) as is, as a literal, basically.  Maybe `array_to_tsvector`?  I'd need to figure out how to convert a `text` to a single-element `text` array, first.

```sql
select ARRAY[w] from (values ('foo'), ('bar'), ('baz')) as wordses (w);
```

Okay, then can we use `array_to_tsvector` for that?

```sql
select array_to_tsvector(ARRAY[w])
from (
  values ('foo'), ('bar'), ('baz'), ('a&b'), ('$/aa')
) as wordses (w);
```

```
array_to_tsvector
-------------------
'foo'
'bar'
'baz'
'a&b'
'$/aa'
(5 rows)
```

That looks like what we want.

We could use `lower(str)` to lower-case any tags, too.  That should be sufficient for literal normalization.  So,

```sql
select array_to_tsvector(ARRAY[lower(w)])
from (
  values ('foo'), ('bar'), ('baz'), ('a&b'), ('$/aa')
) as wordses (w);
```

That should give us the literal lexemes we want.


### Concatting tsvectors

Can we concat `tsvector`s?  Yes, using the `||` operator, as is common for concatenation in Postgres.



[rs-1]: https://stackoverflow.com/questions/16020164/psqlexception-error-syntax-error-in-tsquery/16020565#16020565
[rs-2]: https://stackoverflow.com/questions/14103880/escaping-special-characters-in-to-tsquery
[rs-3]: https://www.postgresql.org/docs/9.6/static/datatype-textsearch.html
[rs-4]: https://www.postgresql.org/docs/9.6/static/functions-textsearch.html
[rs-5]: https://www.postgresql.org/docs/9.6/static/textsearch.html
[rs-6]: https://www.postgresql.org/docs/9.6/static/textsearch-intro.html#TEXTSEARCH-INTRO-CONFIGURATIONS
