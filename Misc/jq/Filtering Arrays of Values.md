Filtering Arrays of Values
==========================

`jq` doesn't use JS as a basis for its language, it's a sort of home spun DSL.  So, time to learn!

What I want to do: Filter elements of the entries in a HAR file based on the URL, but rather than a full URL, just if the URL has some search text in it.

The HAR format has some top-level keys, including meta information, so first I need to drill down to just the entries, I already know the other stuff.

```sh
jq '.log.entries | ...now what?'
```

Next, I need to filter to just those items which have what I'm interested in, Requests to URLs which have a certain search text in them.  After a bit of digging, it seems the way to do this is `map(select(...))`:

```sh
jq '.log.entries | map(select(...))'
```

Apparently `map()` discards non-outputs, which are possibly different from nulls.  Or, quoting the docs, "The function select(foo) produces its input unchanged if foo returns true for that input, _and produces no output otherwise_."  Thus, to filter, you `map(select(...))`, and `select()` will either return the value as is, or not return anything and it won't show up in the result returned by `map()`.

The rest is easy enough: the `foo` in `select(foo)` can be a whole expression, using any number of operators, including the pipe operator.  So, we can check trivially by just drilling down `.request.url` (remember, we're checking each item by itself, not every item in the array all at once, so no `.[]`) then pass it through ... what?

```sh
jq '.log.entries | map(select(.request.url | ...?))'
```

Some more digging around turns up `contains(b)`, a polymorphic function that varies its precise behavior based on the input types:
- Given the input `a` and the param `b`:
    - If `a` and `b` are strings, then this returns `true` if `b` is a substring of `a`; otherwise `false`.
    - If `a` and `b` are objects, then this returns `true` if, for each key in `b`:
        - The value `av` at the given key in `a` yields a `true` result when passed through `contains(bv)` given the value `bv` at the given key in `b`.
    - If `a` and `b` are arrays, then this returns `true` if, for each element `bv` in `b`:
        - There exists an element `av` in `a` that yields `true` when passed into `contains(bv)`.

There's also `test(regex; flags)` (or `test(str)` for simple matches) for a strictly-string-based version, or for cases where I need a regex, because it's not hard enough to read.  Apparently you can also use `test([regex, flags])` if you want.  `match(regex; flags)`

```sh
jq '.log.entries | map(select(.request.url | contains("SEARCH_TERM")))'
```

It works!
