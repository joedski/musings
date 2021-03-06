On HTTP-Transported APIs
========================

Also learning about what RESTfulness actually means.



## Research

1. While verbose, it may be worth using [JSON-API](http://jsonapi.org/) along with the attendant media types as a way to structure JSON responses.
    1. You can include a decent amount of metadata in the resposnes... or you can include them, but only optionally if they're unnecessary. (you only need pagination links sometimes, e.g.)
    2. [Discussion on how to deal with complex actions in JSON-API][ss-1-2]
2. [Roy talking about how most web APIs aren't REST](http://roy.gbiv.com/untangled/2008/rest-apis-must-be-hypertext-driven).
    1. Think I need to read up more on what REST actually means.  Granted, I'm much better equipped to understand such things, now.
        1. NOTE: He does make a point to state that the REST architecture is not The One And Only Way, but merely a way to build APIs with longevity.  Other APIs over HTTP aren't wrong per se, they just aren't REST.
3. [HATEOAS](https://en.wikipedia.org/wiki/HATEOAS) which sounds like a bad thing is actually just the inclusion of what actions a client can perform against a given resources along side the representation of the resource itself that the client receive.
    1. As a simplistic example, a client may receive a blog post itself along with links that tell the client how to update or delete that post.
    2. The intent here is to keep the API for the resource itself discoverable by simply poking the resource, rather than relying on so called Out Of Band Information, e.g. documentation or a separate specification.
    3. As shown in [this example from the RESTful Cookbook](http://restcookbook.com/Basics/hateoas/), the server does not need to always return the same Links for a given Resource.  Rather, only the Links permitted by the server given the current stored state and client state should be sent to the client.
4. [JSON-LD](https://www.w3.org/TR/json-ld/), a W3C standard for standardizing link information in JSON documents.
    1. Does not include permissable actions, though?  Or are those referred to by links?  Hm.
5. [Roy Fielding's Dissertation on the REST Architecture](https://www.ics.uci.edu/~fielding/pubs/dissertation/top.htm), including as applied to HTTP.  Should probably read this.
6. [A description of HATEOAS without calling it that](https://levelup.gitconnected.com/to-create-an-evolvable-api-stop-thinking-about-urls-2ad8b4cc208e) which is pretty readable, though I also read it much later.  I know more things, now, and have built more things, which may have made the reasoning more understandable.
    1. And while I'm not saying it's using anything in particular, the structure htey describe is suspiciously shaped like [JSON API][ss--json-api]...
7. [HAL][ss-7--hal-wikipedia] although the linked page may change from the terse description with examples I saw in 2019-03-22...
    1. [A better description][ss-7-1--hal] that's not just a Wikipedia Summary.
    2. Also note that HAL is meant to be transmittable in both XML and JSON.
    3. A post on [why Drupal went with HAL+JSON rather than JSON-LD][ss-7-3]
8. I'm still trying to figure out what the hell I'm supposed to do with `content-type`.
    1. [This post][ss-8-1] actually gives a somewhat practical explanation, along with the suggestion that "using what \[they]’ve called standard media types give a client developer a leg-up".  Things like [JSON-API][ss--json-api] or [JSON+HAL][ss-7-1].
    2. I've since learned that what you do with defining your Media Type (the `content-type`) is you write the documentation describing the default handling model of your Media Type.
        - This documentation is used by humans to understand the given content and either navigate it themselves or create automatons using that knowledge.
        - The main point is that the documentation is the only piece of external knowledge you need to process the messages.
        - Importantly of course, you should be describing a hypetext media type of some sort, or describing your specific extensions to an existing media type.  (Maybe you have specific behavior described using standard HTML or XML, or you're using JSON+HAL with your own link rel names, etc.)
9. Random blog post [on choosing a hypermedia format][ss-9]
10. [Tools to make HATEOAS Compliance Easier][ss-10]
11. Reddit discussion on [JSON-LD vs JSON-HAL][ss-11]
    1. Therein, Manu Sporny says that JSON-LD is good for very-linked data, but maybe not for those who don't need the full complexity it can entail.
    2. Unfortunately, a post they posted was on G+ and, well, that's been long kerput as of 2019-04, so... Dang.
        1. It is however [on the WaybackMachine][ss-11-2-1]!  Huzzah, Archive.org!
    3. Also linked, [a weighing of avoiding JSON-LD][ss-11-3]:
        1. Focusing too much on trying to stick to a predefined grammar and vocabulary can slow you down
        2. and really you can almost always convert stuff at a later date once the thing has hit its stride.  It's mostly additional mapping data, after all.

[ss-1-2]: https://discuss.jsonapi.org/t/how-to-deal-with-complex-actions/255/9
[ss-7--hal-wikipedia]: https://en.wikipedia.org/wiki/Hypertext_Application_Language
[ss-7-1--hal]: http://stateless.co/hal_specification.html
[ss-7-3]: https://groups.drupal.org/node/283413
[ss-8-1]: https://akrabat.com/restful-apis-and-media-types/
[ss-9]: https://sookocheff.com/post/api/on-choosing-a-hypermedia-format/
[ss-10]: https://nordicapis.com/tools-to-make-hateoas-compliance-easier/
[ss-11]: https://www.reddit.com/r/javascript/comments/1j08ov/hal_vs_jsonld/
[ss-11-2-1]: https://web.archive.org/web/20180124173238/https://plus.google.com/102122664946994504971/posts/T5WkpieNrjJ
[ss-11-3]: https://berjon.com/linked-data/
[ss--json-api]: http://jsonapi.org/


### Some Key Takeaways

1. For Hypermedia-driven APIs, _Media Types_ aren't any more useful than plain text (or a blob) unless standardized.
    1. Consider: As noted [in this post][ss-8-1], HTML has a media type of `text/html`, and although an HTML file is indeed a text file, it's specifically a text file whose contents are structured in accordance with the HTML standard, such as it is.  (granted, HTML is much more standard, now.)
    2. Consider: `application/json` isn't really all that useful because it tells you nothing about the actual structure therein.  All you know is it's JSON, so it may be a dictionary, array, or some primitives.  There are no standardized hypermedia things in there.
        1. One could argue that there is indeed only so much you can specify before you get into application-specific domains, but in counter point Hypermedia contains such application-specific stuff while still allowing a client to know before hand what certain Hypermedia-specific things enable, such as links to other thing.
    3. Consider: `application/hal+json` explicitly defines Links and Embedded Entities, which are additional to the Entity or other information made available in the response.
        1. Anyone who has read the HAL specification now knows what these special fields are for, and can use them to navigate the API available in much the same way they might navigate a(n HTML) website.
        2. This does not preclude out-of-band API Documentation, but it does make the API explorable without having to resort to such out-of-band information.  Any API meant for public consumption would thus benefit from this sort of structure.
        3. By defining a Hypermedia-friendly standard that can also make use of other standard things like Link Rels, both Automated and Human actors can make use of the available information.
        4. Aside: You can also use `application/hal+xml` if that's your jive.
        5. Along with that, you can define your own Rels or specify your exact usage of a given Rel with your own specific documentation, to fill in anything the document itself doesn't already provide.
            1. This is done via the CURIES mechanism, which allows you to define a CURIE key that can be prefixed to a Rel Key.  This CURIE Key is associated with a URL Template, into which the Rel Key can be substituted to yield a Documentation URL.
            2. This thus provides a standard way to create documentation links, making such documentation in-band information.  Or at least, less out-of-band.
            3. One could imagine some of this same machinery could be leveraged with Swagger documents.
    4. Consider: While a standard such as JSON-LD may be vaguely-potentially useful in the long term, [it can also mean a lot of work up front at a time when you might not fully know what you're trying to do][ss-11-3].  That is, it can bog you down and prevent you from actually doing the Useful Thing.
        1. To that point, it could be more useful to blat out the project first, get it into a useful state, then create a separate output modality, likely by specifying a different content type.
    5. Thus: If you are writing a RESTful API, in the manner Fielding originally conceived of when describing the REST architecture, then you're going be spending time describing your Media Type, so that anyone approaching it can use your description to implement their default handling mode for that Media Type.
        1. This documentation should describe 1 of 2 things:
            1. An extension to or profile of an existing hypertext media type, such as XML or HTML.
            2. A new hypertext media type ideosyncratic to your API.
        2. The important things here:
            1. That your media type is a hypertext type.
            2. That you either use standard Link Relation types, or _define_ and use Link Relation types ideosyncratic to your API.
            3. That this documentation and an API entry point are all that any client should need to get started navigating your API.
2. HATEOAS: Hypertext as the Engine of Application State encapsulates the idea that the server should maintain no per-client data about the state of the client application which is not included in the hypertext messages that the client and server exchange.
    1. Consider: The typical web site experience for any given person using a web browser, whether they are accessing a mere static pile of pages, a forum, or a wiki.  These are all HATEOAS compliant, or can be at least, because all client state transitions that the server knows about are fully encoded in the various HTTP requests that the client sends.
        1. The user can bookmark various locations with the expectation that those locations will not change (or that redirects will be implemented should they change).
            1. However, the user should be able to go to the index of the site and still find their way to any place in the side that is relevant to their interests.
        2. Every state change in the application is accomplished via links, mostly that the user clicks on.
            1. Also note: style information and extra code-on-demand links are also part of the page, though these do not represent state changes themselves.
        3. There are client application state changes that cause a change in global application state.  Usually they are wrapped in Forms but are not always so.
            1. The important thing to note is that this is why Fielding refers to Forms as something that can also be included, and why they should be a part of any Media Type description that allows the client to make updates to global application state.
            2. When I say "client application state" and "global application state", it is to distinguish the state of the client application (mostly what page they're on) from the state of the application as a whole, as it lives on the server. (state that can affect (potentially) every client)
    2. Consider: a JWT is meant to be a 'stateless' manner by which a session can be tracked.  This is enabled by the payload being signed and therefore theoretically difficult to tamper with or forge.
        1. This means the Client can always send the JWT as part of its request payload (in a Header) and that any Server can verify the signature and expiration time of the token to determine if they should treat this request as coming from a logged in user or not. (Well, as coming from an authorized client, be it a browser or an automaton, but anyway)
        2. This therefore means that the server does not need a central store of sessions (excepting of course if you want forcibly expired/invalidated tokens...) to determine the user's current logged-in-ness.
