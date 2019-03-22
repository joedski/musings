On HTTP-Transported APIs
========================

Also learning about what RESTfulness actually means.



## Research

1. While verbose, it may be worth using [JSON-API](http://jsonapi.org/) along with the attendant media types as a way to structure JSON responses.
    1. You can include a decent amount of metadata in the resposnes... or you can include them, but only optionally if they're unnecessary. (you only need pagination links sometimes, e.g.)
2. [Roy talking about how most web APIs aren't REST](http://roy.gbiv.com/untangled/2008/rest-apis-must-be-hypertext-driven).
    1. Think I need to read up more on what REST actually means.  Granted, I'm much better equipped to understand such things, now.
        1. NOTE: He does make a point to state that the REST architecture is not The One And Only Way, but merely a way to build APIs with longevity.  Other APIs over HTTP aren't wrong per se, they just aren't REST.
3. [HATEOAS](https://en.wikipedia.org/wiki/HATEOAS) which sounds like a bad thing is actually just the inclusion of what actions a client can perform against a given resources along side the representation of the resource itself that the client receive.
    1. As a simplistic example, a client may receive a blog post itself along with links that tell the client how to update or delete that post.
    2. The intent here is to keep the API for the resource itself discoverable by simply poking the resource, rather than relying on so called Out Of Band Information, e.g. documentation or a separate specification.
    3. As shown in [this example from the RESTful Cookbook](http://restcookbook.com/Basics/hateoas/), the server does not need to always return the same Links for a given Resource.  Rather, only the Links permitted by the server given the current stored state and client state should be sent to the client.
4. [JSON-LD](https://www.w3.org/TR/json-ld/), a W3C standard for standardizing link information in JSON documents.  Does not include permissable actions, though?
5. [Roy Fielding's Dissertation on the REST Architecture](https://www.ics.uci.edu/~fielding/pubs/dissertation/top.htm), including as applied to HTTP.  Should probably read this.
6. [A description of HATEOAS without calling it that](https://levelup.gitconnected.com/to-create-an-evolvable-api-stop-thinking-about-urls-2ad8b4cc208e) which is pretty readable, though I also read it much later.  I know more things, now, and have built more things, which may have made the reasoning more understandable.
7. [JSON HAL](https://en.wikipedia.org/wiki/Hypertext_Application_Language) although the linked page may change from the terse description with examples I saw in 2019-03-22...
    1. [A better description](http://stateless.co/hal_specification.html) that's not just a Wikipedia Summary.
