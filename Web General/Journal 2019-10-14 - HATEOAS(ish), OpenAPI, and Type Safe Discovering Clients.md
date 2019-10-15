---
tags:
    - hateoas
    - rest-api
    - openapi
    - typescript
---

Journal 2019-10-14 - HATEOAS(ish), OpenAPI, and Type Safe Discovering Clients
========

I'd recently read a post that I really wish I'd saved, about OpenAPI and Swagger Tooling vs REST and HATEOAS.  To paraphrase based on my understanding, the author said "OpenAPI and Swagger tools aren't bad per se, but they can lead to laziness and don't direct people to evolvable API patterns."

One complaint point they gave was that neither the OpenAPI spec nor any Swagger tools suggest anything like Hypermedia Links, to specify actions that can be performed based on the current response from a given endpoint.  This is one thing required to implement evolvable APIs in a HATEOAS like manner: without Mypermedia Links, you have to know before hand what all API endpoints are available, whereas _with_ Hypermedia Links, you only have to know `GET /` and you can go from there.  And, if any endpoints change, you've just screwed a client somewhere.

I'm going to use this journal as a place to jot down thoughts on building a HATEOAS style API, providing OpenAPI docs from it, and hopefully some thoughts on how to begin approaching such an API with Typescript.  Preferably with at least some compile time help, but honestly Hypermedia is very much a data driven thing that has to be interpreted based on what's received rather than starting with preconceived pathways.  Yanno, the way humans interface with the web.

> None of this is to say that your web app necessarily must be setup in a HATEOAS style, there's nothing really wrong per se about APIs that are just REST-oidal JSON thingies.  That's really more about pedants saying that calling them REST APIs is technically wrong since most "REST" APIs aren't really RESTful, just RESTish, for various reasons.



## Discovery-Based Clients

The way HATEOAS is setup is basically to shift the hardcoding, if you even do hardcode things, from API Endpoints to Link Keys.  That is, instead of a Client memorizing a bunch of API Endpoints, that Client memorizes a bunch of Link Keys and uses those to map from a given Endpoint Response to other Endpoints.

> Note: I say "Hypermedia Link Keys", but it could also be "Hypermedia Link Names".  Same thing here.

That's a bit garbage of a description, so it's like:

- Rather than memorizing this: `GET /foos/{foo-id}`
- Memorize this:
    - Initially get the API entry point: `GET /`
    - See a Hypermedia Link in the response whose key is `foo:list`, which the client has previously memorized as how to identify the link that gets a list of Foos.
    - Make the request to the API for the endpoint identified by `foo:list`, which happens to be `GET /foos`, to get back a list of Foos.
    - See a Hypermedia Link in one of Foos to `foo:get-by-id`.
    - Make the request to the API for the endpoint identified by `foo:get-by-id`, which happens to be `GET /foos/{foo-id}`.  Could be specifically `GET /foos/abc123`, etc.  Could even be at the top level, using a URL template or something, any number of things like that.

If we wanted to start hard coding things, then, we could say that rather than a bunch of pathnames we get a "path of Hypermedia Link Keys". (and endpoint parameters...)  The above example could then be represented by something like `/foo:list/foo:get-by-id(foo-id)`.

Proponents of discoverable APIs might balk at even that, since that's basically the same thing as before, just once removed, but oh well.  Client apps are eventually going to hard code something because they're all about dealing with specific things, and we're not programming in terms of AIs which understand human-named things and interpreting between the intents of the human driver and the keys.

... though maybe some day we will?

Regardless, for now coded up clients will have to do something to memorize things.  Even more for any attempt at type safety.


### Extracting Data From Responses

Theoretically, you can just download the OpenAPI doc, or possibly a slice thereof specific to a given endpoint, and know afterwards from that what the shape of your data is.  This doesn't help statically typed code much, since everythings' shapes are defined only at run time and could change even from minute to minute, though hopefully they don't do that...

About the only thing you can really do is this:

- Assume that all data is of arbitrary form/shape: until observed, it's a superposition of all available types describable by the transport format.  Probably JSON since that's the fashionable thing, nowadays.
- Only identify things in your code which you actually need:
    - Run-time duck-typing, essentially.
    - Structured accessors/parsers specified like with Elm's JSON processing functions come to mind.
- Log and _report_ errors in response body access, so you know when and where you need to update your client app.
    - Being able to log stack traces and request params here can help.
    - Note that if handling PII or other sensitive information, it may be wise to enforce hiding of such sensitive information in reports by, say, requiring a specific wrapper that whitelists certain props to actually report values, something like that.
        - Then, any unwrapped data just gives a generic, minimal information thing.  Maybe just "(Unsanitized potentially sensitive data)" or a list of property names but no values, etc.

You could use the OpenAPI doc to statically generate validators before hand, but even those will only be able to provide you with either confirmation or rejection of response bodies from the API, and you still don't technically know before hand which endpoint the client will be pointed to for what thing.
