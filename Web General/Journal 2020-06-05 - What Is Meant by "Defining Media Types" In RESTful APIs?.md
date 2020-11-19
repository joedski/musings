Journal 2020-06-05 - What Is Meant by "Defining Media Types" In RESTful APIs?
========

Here is a good quote I only just found on 2020-11-19:

> "A truly RESTful API looks like hypertext. ... Think of it in terms of the Web. How many Web browsers are aware of the distinction between an online-banking resource and a Wiki resource?  None of them.  They don’t need to be aware of the resource types. What they need to be aware of is the potential state transitions — the links and forms — and what semantics/actions are implied by traversing those links."
>
> —[Roy Fielding][fielding-comment-restful-api-looks-like-hypertext]

That's probably the most succinct description.  From there, all the work on describing the media type and how clients interact with it makes much more sense.



## Initial Research

I've been trying to learn better just what's involved in making a RESTful API, because the idea of creating an API where semantic actions can have different links associated with them as the API evolves is a neat one, but one thing I've not really been able to figure out until now is just what is meant by "defining media types".  This is always said to be necessary as part of defining a truly restful API, but it's just sort of stated then ... that's it.  Not even examples.

Frustrating.

1. [This DZone Article "5 Easy to Spot Tells That Your API Isn't RESTful"][dzone-5-tells] gives an actual example... sorta.
    - It's also, so far as I can tell, incorrect.
2. [Fielding's Dissertation on REST, Chapter 5: The REST Architecture and Its Tradeoffs][fielding-chap-5-rest]
    - Notable in that it clearly enumerates tradeoffs made for the architectural style, such that depending on your use case you may not actually want to use REST.
        - One explicitly noted one: Since REST messages are meant to be self-describing, they'll natually be larger (usually) than a message system that relies on implicit knowledge.
    - That is to say (and Fielding himself says so) if you want RPC, use RPC, just please stop calling it REST.
3. Some various comments about REST from Fielding, what it is and what it isn't.
    1. [Comment about how the media type's default processing model is important, about self descriptive messages reducing the need to discover an API's interface, and why resource modeling is important][fielding-comment-hypertextual-and-media-types].
    2. [Fielding's comment about how he wasn't able to give the topic of Media Type Design enough due in his whitepaper because he ran out of time.][fielding-comment-longtermism].
        - Also this gem: "REST is software design on the scale of decades: every detail is intended to promote software longevity and independent evolution. Many of the constraints are directly opposed to short-term efficiency."
    3. ["REST is intended for long-lived network-based applications that span multiple organizations. If you don’t see a need for the constraints, then don’t use them. That’s fine with me as long as you don’t call the result a REST API. I have no problem with systems that are true to their own architectural style."][fielding-comment-call-it-what-it-is]
        - Also remarks about how REST doesn't eliminate a priori knowledge, just concentrates it, which is ... suspiciously familiar.  Hm.
        - Also also: "\[The REST architecture] has value because it is far easier to standardize representation and relation types than it is to standardize objects and object-specific interfaces."
    4. Why does the API need control over the pathing?  ["Because implementations change, but cool URIs don’t"][fielding-comment-http-methods-and-post-response-and-why-api-controls-paths]
        - Also remarks about HTTP operations being generic, and each given resource deciding what they actually mean; and how a POST to one resource may result in a 201 with a new representation, while another may be a 204 with a Location header field that contains the URI of the newly created resource.

> UPDATE 2020-11-19: After reading through Roy's comments again, the REST architecture style description, and letting it marinate for a bit, I've decided that the [DZone article][dzone-5-tells] is not being RESTful as you end up peppering the client with a bajillion media types.  That might be fine if you have a bunch of different media types that are general across a great many applications out there in the world, but not if it's your own API.
>
> Instead, if you want typed information, you include as part of your hypertext specification the notion of a data type schema that you can link to and use that.  Your specification doesn't care about specific data types, though, rather it cares about the generalization over all responses, that is to say the uniform interface through which the information is transmitted.

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



## After Digesting Comments and Examples

- Concentrate necessary implicit knowledge into one place: You define your media types for your API so that any client that wants to process those media types only has to look at a single document to learn how to do that.
    - Along with that should be a notion of Forms, when your client must send a request with a body.  By describing a notion of Forms in your Media Type, you tell the client how to understand the API when the API tells the client what data can be sent.
- REST Messages as the Engine of Application State: To be RESTful, your media type must be a hypertext media type, using links that have defined relations.  It is these links that describe valid state transitions in the application.
- The Client already knows how to do HTTP, and that is not part of describing a media type.  HTTP is taken as a given, if your API is served over HTTP.
    - Rather, your Media Type documentation can say things like "to dereference a Link, make an HTTP request to the given path using the specified method or GET if no method is specified...".


[gh-v3-mediatypes]: https://developer.github.com/v3/media/
[dzone-that-aint-rest]: https://dzone.com/articles/5-easy-to-spot-tells-that-your-rest-api-is-not-res
[fielding-dissertation]: https://www.ics.uci.edu/~fielding/pubs/dissertation/top.htm
[fielding-dissertation-ch5]: https://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm
[fielding-dissertation-ch5-sec-5-2-1]: https://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm#sec_5_2_1
[fielding-comment-restful-api-looks-like-hypertext]: https://roy.gbiv.com/untangled/2008/rest-apis-must-be-hypertext-driven#comment-720
[fielding-comment-longtermism]: https://roy.gbiv.com/untangled/2008/rest-apis-must-be-hypertext-driven#comment-724
[fielding-comment-hypertextual-and-media-types]: https://roy.gbiv.com/untangled/2008/rest-apis-must-be-hypertext-driven#comment-730
[fielding-comment-call-it-what-it-is]: https://roy.gbiv.com/untangled/2008/rest-apis-must-be-hypertext-driven#comment-742
[fielding-comment-http-methods-and-post-response-and-why-api-controls-paths]: https://roy.gbiv.com/untangled/2008/rest-apis-must-be-hypertext-driven#comment-732
[dodds-rest-client-example-spam-e]: https://blog.ldodds.com/2008/10/23/explaing-rest-and-hypertext-spam-e-the-spam-cleaning-robot/
