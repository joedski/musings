Journal 2020-06-05 - What Is Meant by "Defining Media Types" In RESTful APIs?
========

I've been trying to learn better just what's involved in making a RESTful API, because the idea of creating an API where semantic actions can have different links associated with them as the API evolves is a neat one, but one thing I've not really been able to figure out until now is just what is meant by "defining media types".  This is always said to be necessary as part of defining a truly restful API, but it's just sort of stated then ... that's it.  Not even examples.

Frustrating.

1. [This DZone Article "5 Easy to Spot Tells That Your API Isn't RESTful"][dzone-5-tells] gives an actual example... sorta.
2. [Fielding's Dissertation on REST, Chapter 5: The REST Architecture and Its Tradeoffs][fielding-chap-5-rest]
    - Notable in that it clearly enumerates tradeoffs made for the architectural style, such that depending on your use case you may not actually want to use REST.
        - One explicitly noted one: Since REST messages are meant to be self-describing, they'll natually be larger (usually) than a message system that relies on implicit knowledge.
    - That is to say (and Fielding himself says so) if you want RPC, use RPC, just please stop calling it REST.

[dzone-5-tells]: https://dzone.com/articles/5-easy-to-spot-tells-that-your-rest-api-is-not-res
[fielding-chap-5-rest]: https://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm

Going by [that DZone article][dzone-5-tells], it's basically including the actual entity type along with the transport format, instead of just the transport format.  The comparison they give is:

- Suppose Java or other typed languages:
    - Bad: `Object getProducts();`
    - Good: `List<Product> getProducts();`

But they don't expand on that at first other than to say:

> By using generic Media Types, you are relying on the client to know what is inside that JSON message and how to interpret it. This is called implicit knowledge and is primarily responsible for brittleness, the tendency for something to break because of changes made elsewhere.
>
> To counteract brittleness, it is best if all messages define their own Media Type, just as all Types in code define their own Class. This definition should not just include syntax but also how to interpret the message, how to follow its links, how to process its forms if there are any, how to display it on screen, and so on.

And ... how exactly does one do that?  Embed an entire DSL in JSON or XML?  Then you still need to know how to process that DSL.  At what point do we settle with some level of implicit knowledge before we go to just straight up returning JS?

An actual example media type isn't given until later, when they talk about what documentation should actually describe instead of just paths and parameters:

> ```
> Type: "application/vnd.acme.productlist+json"
>   - Represents a paged product listing in the following JSON format:
>     { "products": [
>       { "self": "/product/123",
>         "name": "ACME Router"
>       },
>       ...
>       ],
>       "nextPage": "/products?page=3",
>       "previousPage": "/products?page=1"
>     }
>   - The "self" link in Products leads to the product listed
>   - The global "nextPage" link, if present, leads to the next page
>     of the product listing
>   - Similarly, the "previousPage" to the previous (if not on first page)
> ```

A couple notes on that, because I've skipped over some portions of the article:

- What's normally `id` is changed to `self`, with a Path String rather than a Numeric ID.
    - Importantly, this Path String should be treated with the usual care of any fixed string: assume it is as it is, and that there is no mechanical information to extract by parsing it, and that it is not meaningfully modifyable because that is fragile.
    - Also importantly, the Client is given a way to get the identified resource: just plunk the path string on the end of the origin!  Now the client no longer needs to build a path string using the ID, _because the ID is literally already the location of the resource on the service_.
- `nextPage` and `previousPage` are also Path Strings, with the same considerations as `self`.
- The way you get the typical path is by using an "index", located at `/`, which tells the client the available endpoints and what they're for.

Anyway, there we see an actual media type: `application/vnd.acme.productlist+json`, and a statement on what that is.

That seems more reasonable, then, since otherwise the client could not know what to expect with a strange and new media type and would just go blithely on saying "it's JSON".  And, it does confirm what I thought of when they made that comparison to Java/C/Whatever variable types.

It also makes sense in the context of other formats like images: the client knows they're a JPEG, GIF, PNG, or whatever, so the client can load the appropriate handler for each one, but it doesn't actually care what's inside them.  (Something like an image recognition AI thingy might care, but the client asking the server for that image doesn't.)

Could you get away with things like `application/vnd.acme.list(product)+json`?  Or should you instead use a `type` field to dynamically parametrize entity handling?
