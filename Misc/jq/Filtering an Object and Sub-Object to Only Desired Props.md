Filtering an Object and Sub-Object to Only Desired Props
=======

Summary: Go to the object you want to filter props of, recursively whittle down things.

So, for example, to get an endpoint by `operationId` while keeping the path and method, do this:

```bash
jq '.paths
  | with_entries(
    .value
    |= with_entries(
      select(.value.operationId == "getFoo")
    )
    | select(.value | length > 0)
  )'
```



## Workthrough

```bash
test_input='{
  "/foo": {
    "get": { "operationId": "getFoo" },
    "post": { "operationId": "postFoo" }
  },
  "/bar": {
    "get": { "operationId": "getBar" }
  }
}'
```

Well, I know I can use `with_entries(select(...))` to filter things, operating on any value of any property:

```bash
echo "$test_input" | jq 'with_entries( select( .key == "/foo" ) )'
```

```json
{
  "/foo": {
    "get": {
      "operationId": "getFoo"
    },
    "post": {
      "operationId": "postFoo"
    }
  }
}
```

I can at least filter these top level entries by the contents of one of their sub properties, though it still keeps all the sub properties...

```bash
echo "$test_input" | jq 'with_entries( select( .value | with_entries(select(.value.operationId == "getFoo")) | length > 0 ) )'
```

```json
{
  "/foo": {
    "get": {
      "operationId": "getFoo"
    },
    "post": {
      "operationId": "postFoo"
    }
  }
}
```

Um.  Filter entries to just those which have the right property value?

```bash
echo "$test_input" \
  | jq '
    with_entries(
      select(
        .value
        |= with_entries(select(.value.operationId == "getFoo"))
        | length > 0
      )
    )'
```

```json
{
  "/foo": {
    "get": {
      "operationId": "getFoo"
    },
    "post": {
      "operationId": "postFoo"
    }
  },
  "/bar": {
    "get": {
      "operationId": "getBar"
    }
  }
}
```

Uh, not quite.  Not sure what's going on there, but it's not what I want.  What do try next?

Well, I know for certain that `with_entries()` (and so `map()`) can filter by using `select()`, so how about this:

- With entries:
    - Select those entries whose values fit the following:
        - With entries of that value, select those entries whose values have the property operation ID that matches the target value.
        - Check if the length of the new value is greater than 0.
    - Update the entry's value to be:
        - With entries of that value, select those entries whose values have the property operation ID that matches the target value.

```bash
echo "$test_input" | jq 'with_entries(
  select(
    .value | with_entries(select(.value.operationId == "getFoo")) | length > 0
  )
  | (.value |= with_entries(select(.value.operationId == "getFoo")))
)'
```

```json
{
  "/foo": {
    "get": {
      "operationId": "getFoo"
    }
  }
}
```

That gets what we want, but duplicates the actual filter.  How about we update the value of the entry first, then filter on 0-length?

```bash
echo "$test_input" | jq 'with_entries(
  (.value |= with_entries(
    select(.value.operationId == "getFoo")
  ))
  | select(.value | to_entries | length > 0)
)'
```

```json
{
  "/foo": {
    "get": {
      "operationId": "getFoo"
    }
  }
}
```

This seems to work as an approach, then.

However, do we even need that last `to_entries`?  `jq`'s docs specify a behavior for `length` on objects: the number of KV-Pairs, or basically the number of entries.

```bash
echo "$test_input" | jq 'with_entries(
  (.value |= with_entries(
    select(.value.operationId == "getFoo")
  ))
  | select(.value | length > 0)
)'
```

```json
{
  "/foo": {
    "get": {
      "operationId": "getFoo"
    }
  }
}
```

Nice.

So, in all, we get this:

- (Not shown) Drill down to property that contains the desired object-value, but which contains the props we want on the output.
- Whittle down to only top-level keys with desired values:
    - With entries:
        - Update entry.value to be:
            - With entries of entry.value, select those entries whose .value.operationId equals the target value.
        - Then, select only those entries which have a non-empty `.value`.
