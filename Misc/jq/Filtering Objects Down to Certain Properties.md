Filtering Objects Down to Certain Properties
========

This is simple to do, but not quite obvious at first: use `with_entries(select(CONDITION))`:

```bash
jq '.definitions | with_entries(select(.key == "Foo" or .key == "Bar"))' < openapiv2-doc.json
```

A bit verbose, but it works and, importantly, outputs an object.
