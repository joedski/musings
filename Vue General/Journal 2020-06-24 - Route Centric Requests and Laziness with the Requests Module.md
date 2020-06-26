Journal 2020-06-24 - Route Centric Requests and Laziness with the Requests Module
========

Suppose: We don't like the usual requests setup with manually managed requests and data, but we do like that we can be lazier with regards to fetching route specific data.

Whether or not that laziness is actually a good thing or not, we'll put that down for now and maybe pick it up later.

To wit, we'd like to have this:

- If we're on a given set of routes, fetch the data only once then do not fetch it again:
    - Go to `/foo/{id}`
        - Fetch `/api/foo/{id}`
    - Go to `/foo/{id}/bar`
        - Reuse data from `/api/foo/{id}`
    - Go back to `/foo/{id}`
        - Reuse data from `/api/foo/{id}`
- If we're on a given set of routes, then go to another set, always fetch the new data:
    - Go to `/foo/{id}`
        - Fetch `/api/foo/{id}`
    - Go to `/foo/{id2}`
        - Fetch `/api/foo/{id2}`
    - Go to `/foo/{id}`
        - Fetch `/api/foo/{id}`

Hm.
