Journal 2020-07-31 - On REST, General Application Architecture, And Sustainable Development
========

I wish I could say this is going to be a deep post, but honestly it's probably going to be a short bit of inane rambling.  If I'm lucky, it'll be followed at length by some even less related verbal peripateticism.  (The meandering kind, not the philosophical kind, which is [apparently a thing](https://en.wikipedia.org/wiki/Peripatetic_school).)

The architectural decisions and contraints in the [REST Application Architecture][fielding-chap-5-rest] are geared towards [long term software design, with many thing directly opposed to short term efficiency][fielding-comment-longtermism].  It's not meant to be succinct, but rather is meant to descriptive and obvious, and [put most of the documentation into the description of the Media Types][fielding-comment-hypertextual-and-media-types] rather than on defining HTTP Methods + Paths, which are instead just taken to be incidental to the API.  A REST API handle things in terms of Resources whose Representations have Links to other Resources, these Links being the State Transitions forming the ST of REST. (The RE being the Representation, hence Representational State Transfer)

Because of this, REST messages are bigger than RPC messages, but give future users of the API a huge affordance in using the application even without any additional documentation: The API is explorable without any a priori knowledge, though you'll have a much easier time if you can find the Media Type documentation, or if the API uses an existing one like HTML or XML or something.  Thus, when any client accesses a Resource of a REST API, they see all the available State Transitions from that Representation of that Resource because all those State Transitions are enumerated by the Links within that Representation.

A few things stuck out to me regarding this, and regarding my own habits in application development:

- Explicit Rather Than Implicit: Although each message is larger, each message also fully informs the Client where the Client can go next for what reason by sending the Client a bunch of Links.
    - In my own application development style, I've come to strongly favor Explicit Rather Than Implicit when creating new features in the application.
    - For UI development, this leads to each Controller itself being larger, but implemented using a bunch of small, well-defined, orthogonal services or delegate controllers.  Define only abstractions that are regular to the entire app and use each of them in the controller, instead of creating one-off global modules.
        - See also Documentation of Generalities Rather Than Specializations.
        - Also, amusingly, this actually tends to lead to _smaller_ controllers than many of the non-styles I see used. (Or which I used when I was a more junior dev.)
- Developer Affordance: Because everything is explicit, with the only implicit knowledge being the Default Processing Model for the given Media Type, future developers have a very good idea (and constant reminder) about what all the API will allow them to do, what all State Transitions they have available to them.
    - Following directly from Explicit Rather Than Implicit, where anything using a feature should somehow explicitly reference that feature, this is done so that future developers have that extra affordance, that extra reference they can follow to learn about the codebase and how things work.
- Documentation Of Generalalities Rather Than Specializations: As noted, the documentation for the Media Type is about the Default Processing Model of that Media Type, not about any given endpoint.  Much in the way that knowing how to process HTML allows any web browser Client to go through any web page (piloted by a User), knowing how to process the Media Type used to encode the API's messages will allow any Client to understand how to extract available State Transitions from those messages.
    - Most of the documentation for my code focuses on the Libraries and Frameworks because those are the most interesting things.  Each specialization, each specific integration of features, should itself be boring and obvious, if sometimes a bit verbose.
    - That is to say, for a Vue application or any other SPA, each Page/View/whatever should either be a simple, obvious, combination and parametrization of explicitly referenced features, or should contain references to other components that themselves are simple, obvious, etc.

In the end, what I try to strive for is simplistic application development: I want to be able to write code that is no more interesting than the UX it implements.  A table of data should be a table of data, and should not have to worry about smartly caching or being lazy about loading, which brings to mind another quote:

> "… However, I think most people just make the mistake that it should be simple to design simple things. In reality, the effort required to design something is inversely proportional to the simplicity of the result. As architectural styles go, REST is very simple."
>
> —[Roy Fielding][fielding-comment-longtermism]

The ultimate goal of my tools is to make application development simple and boring, to make things a declarative and explicit as possible so the next person coming to it will at least have some notion of what's going on in the given page.  However, a lot of thought must go into analyzing patterns of usage, of operation, in order to extract those commonalities into tools to simplify development in such a way that doesn't get in the way of other valid use cases.

I won't claim to be on Fielding's level, but digesting REST and taking a moment to think about my own development habits, there seems to be some consonance there.

[fielding-chap-5-rest]: https://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm
[fielding-comment-hypertextual-and-media-types]: https://roy.gbiv.com/untangled/2008/rest-apis-must-be-hypertext-driven#comment-730
[fielding-comment-longtermism]: https://roy.gbiv.com/untangled/2008/rest-apis-must-be-hypertext-driven#comment-724
[fielding-comment-call-it-what-it-is]: https://roy.gbiv.com/untangled/2008/rest-apis-must-be-hypertext-driven#comment-742
[fielding-comment-http-methods-and-post-response-and-why-api-controls-paths]: https://roy.gbiv.com/untangled/2008/rest-apis-must-be-hypertext-driven#comment-732
