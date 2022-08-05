---
tags:
    - rest-api
---

Journal 2022-03-11 - Is My API RESTful?  Like, Actually RESTful?
================================================================

1. Can an authorized user hit your API's root URL and see what all resources are available through your API?  Can they explore your API via links that it sends to them and discover what all is available to them?
    1. If not, your API is not RESTful as it assumes the user knows about all the concrete offerings before hand, or that they must know some other way to learn that information such as an entirely unrelated webpage.
    2. To be clear, an authorized user _must_ be able to eventually navigate to every single non-deprecated endpoint that they are permitted to use.  Not everything must be listed at the API's root URL, since many if not most requests will be relative to some specific resource, but they must be able to reach it _only_ through requests that they learn about through what the API sends to them.
2. When an authorized user accesses a resource, do they see what all actions they are allowed to perform on that resource and how to perform them?  Does the API send them links so they can see each permitted action enumerated?
    1. If not, your API is not RESTful as it assumes the user knows about those actions and how to parametrize them.
3. Is there documentation describing how users can understand your API responses, such that they can write clients to consume those responses and navigate through the API?
    1. If not, your API is not RESTful as it does not concetrate all the necessary general/out-of-band/a-priori/pre-assumed knowledge in one place.
4. Does your documentation describe your API's responses generally, rather than focusing on specific endpoints and resources?  That is, does your documentation describe the media type that the server sends to the client rather than focusing only on specific endpoint paths, methods, and specific bodies?
    1. If not, your API is not RESTful as it is concerned with each concrete resource and action instead of on the generality of how the client and server communicate.
    2. You can still document specific endpoints/resources/methods, but perhaps consider making that documentation available through the API itself instead of having it only on a random page somewhere else.  Alternatively, consider at least embedding a link to that documentation web page in the response.
        1. If you want to include type or schema information, consider embedding a link to that as well.  Such information is useful to clients if they want to verify that they can still use the data being sent, or if they need to eagerly emit that there's a version mismatch.  Just make sure you document how such schemas are linked.  (It might just be a specific link relation.)
5. Does your server send the client forms to fill out or otherwise tell the client what data is needed and what sort of values are acceptable?
    1. If not, your API is not RESTful as it assumes that the client knows before hand what to send to a given endpoint, and how to send it.

Some other notes:

1. Regarding HTTP: if your API is transported over HTTP, you can pretty well assume that any client a user writes will understand HTTP.
    1. You do not need to document HTTP itself, only what HTTP parameters your API uses and how it uses them.  That is, you can assume HTTP is part of the context within which your app operates, so that you only need to define how your API builds on HTTP and whatever else (JSON?  XML?  HTML?  S-Expressions?  Some unholy mess of Protobuf?  Something else entirely?) so that others know how to treat _any_ responses they receive.
