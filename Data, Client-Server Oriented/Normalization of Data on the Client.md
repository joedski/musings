Normalization of Data on the Client
===================================

There are two main courses of thought I have about this:
1. Determine if you really need any normalization at all.
  - Normalize only what absolutely needs it, and no more than that.
2. If you do, automate it using configuration data from the same API server you got the data from.

Determining course 1 is pretty application specific, but I would tend to try to get away with as little as possible.  Most data on the client side is considered volatile and potentially out of date, anyway, and should tend to be eagerly fetched from the server unless you're creating a mobile-oriented SPA.

Course 2 is what I'll focus on here.



## Summary

- RESTish things sending JSON should use JSONSchema to specify the shapes of data.
  - And probably Swaggerdocs to document the API.
- Client sends an extra header on a request telling the server it wants a response-shape schema.
- Server responds with the data and extra headers with:
  - The schema describing the shape of the response, using `$ref`s for Normalizable Entities.
  - The path to a downloadable Definitions schema, so the Client can learn what the shape of each `$ref` is.
- Client creates normalizer functions for each `$ref` in the Definitions schema.
- Congratulations, you can now do what GraphQL + (Relay|Apollo) does.
