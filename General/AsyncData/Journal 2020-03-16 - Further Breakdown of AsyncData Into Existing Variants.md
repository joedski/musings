---
tags:
    - algebraic-data-types
    - algebraic-data-types:async-data
summary: >-
    AsyncData as a composition: Maybe AsyncDataState (Result Response Error)
---

Journal 2020-03-16 - Further Breakdown of AsyncData Into Existing Variants
========

Musing on further breaking AsyncData into other data types.

Basically:

```ocaml
type 'a maybe = Some of 'a | None
type ('s, 'e) result =
| Success of 's
| Error of 'e
type ('s, 'e) async_data_state =
| Waiting
| Result of ('s, 'e) result
```

From there, you would still have all the typical operations:

```ocaml
let foo_result =
    match foo_datum with
    | None -> "None case"
    | Some Waiting -> "Waiting case"
    | Some (Result (Error e)) -> "Error case: " ++ (error_message e)
    | Some (Result (Success d)) -> "Data case: " ++ (magical_serializer d)
```

Naturally, that's obnoxious, so you'd want to define a bunch of operators immediately.

```ocaml
let id x = x
let unit_data d = Some (Result (Success d))
let unit_error e = Some (Result (Error e))

let map data_fn error_fn datum =
    match some_datum with
    | Some (Result (Success d)) -> unit_data (data_fn d)
    | Some (Result (Error e)) -> unit_error (error_fn e)
    | Some Waiting -> Some Waiting
    | None -> None

let map_data data_fn = map data_fn id

let map_error error_fn = map id error_fn
```

Something something `bind`/`join`/`flat_map` too I guess.  Not sure how useful this is in practice, since honestly it's plain easy to just make a more descriptive flat variant, but eh.

It could be thought of as this breaking the entire process into a series of binary decisions:

1. Has the async process begun?  (Maybe/Option)
2. Has the async process ended?  (Waiting|Result (though it could be another Maybe/Option))
3. Did the async process end in success or error?  (Result)

I suppose looking at it like that, you could define it as `Maybe (Maybe (Result data error))`. (or `('data, 'error) result maybe maybe` which looks just as silly.)

Of course, just because that technically can be represented like that doesn't mean it's a good or meaningful representation.  For one thing, it's not very helpful when debugging.
