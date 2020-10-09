Finding Swagger Endpoints with Parameters Lacking Type or Schema
========

I was trying to import into Postman a Swagger 2 doc from a service I was working on but Postman kept complaining about an endpoint where one or more parameters were missing both `type` and `schema`.  Sadly, it did not actually tell me which endpoint violated this expectation.

So, time to waste time writing a jq script to find that for me.

In this case, what I ultimately wanted was this:

```sh
jq '
  .paths
  | with_entries(
    .value |= with_entries(
      select(.value | has("parameters"))
      | select(.value.parameters | all(has("type") or has("schema")) | not)
    )
    | select(.value | keys | length > 0)
  )
'
```
