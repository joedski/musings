Extracting All Instances of a Prop from Matomo Data
===================================================

I need to extract all the unique `label`s of a bunch of data from Matomo.

So, given:

```
{
  [idSite]: {
    [date]: [
      { "label": ..., ... }
    ]
  }
}
```

Example:

```
echo '{
"foo": { "a": [ { "label": ":)" }, { "label": ":(" } ] },
"bar": { "a": [ { "label": ":U" } ] },
"baz": { "a": [] }
}'
```

This gives all unique labels in site 1:

```
jq '.["1"] | to_entries | .[].value | [ .[].label ] | unique'
```

This gives all unique labels in all sites:

```
jq '[ to_entries | .[].value | to_entries | .[].value | .[].label ] | unique'
```

Breaking it down:

```
to_entries =>

  [ { "key": idSite, "value": { [date]: [ { "label": "...", ... }, ... ], ... } }, ... ]

.[].value =>

  { [date]: [ { "label": ... }, ... ], ... }
  { [date]: [ { "label": ... }, ... ], ... }
  ...

to_entries =>

  [ { "key": date, "value": [ { "label": ... }, ... ] }, ... ]
  [ { "key": date, "value": [ { "label": ... }, ... ] }, ... ]
  ...

.[].value =>

  [ { "label": ... }, ... ]
  [ { "label": ... }, ... ]
  [ { "label": ... }, ... ]
  [ { "label": ... }, ... ]
  ...

.[].label =>

  "label1"
  "label1"
  "label2"
  "label2"
  "label3"
  "label3"
  "label4"
  "label4"
  ...

[ (all of the above) ] =>

  [
    "label1",
    "label1",
    "label2",
    "label2",
    "label3",
    "label3",
    "label4",
    "label4",
    ...
  ]

unique =>

  [
    "label1",
    "label2",
    "label3",
    "label4",
    ...
  ]
```

Optionally, we could add another `| .[]` to the end and receive them undelimited, but we do still need to wrap everything before the `unique` with `[ ... ]` to put everything inside a single array as before then they're a bunch of separate entities, strings to be exact, and not only would `unique` be executed on each one separately, but it doesn't work on strings.



## The Shape of Data

Note that the above is only for certain query params sent to Matomo, specifically `period` not set to `range` and for more than one `idSite`.  Each of these: setting `period=range`; and having `idSite` be only a single value; removes a layer of grouping from the results, and thus removes a `to_entries | .[].value` from the `jq` instructions above.

Expanded, we have something like this, where `{ "data here": "..." }` is used as a stand in for whatever the report method would return, be it an array of records or a single aggregate record.

#### Multiple Sites, Period Not Range

Query: `?idSite=1,2&period=day&date=last7` (`date` added just as an example.)

```json
{
  "1": {
    "2018-05-19": { "data here": "..." },
    "2018-05-20": { "data here": "..." },
    "...": "..."
  },
  "2": {
    "2018-05-19": { "data here": "..." },
    "2018-05-20": { "data here": "..." },
    "...": "..."
  },
}
```

#### Single Site, Period Not Range

Query: `?idSite=1&period=day&date=last7`

Note the grouping by site id is now gone.

```json
{
  "2018-05-19": { "data here": "..." },
  "2018-05-20": { "data here": "..." },
  "...": "..."
}
```

#### Multiple Sites, Period Is Range

Query: `?idSite=1,2&period=range&date=last7`

```json
{
  "1": { "data here": "..." },
  "2": { "data here": "..." }
}
```

#### Single Site, Period Is Range

Query: `?idSite=1,&period=range&date=last7`

```json
{ "data here": "..." }
```
