Versioning of APIs
==================

Everything I've read indicates that versioning of APIs is hard.  I wonder if there's even any way to do it sanely without some jank?



## Research

- ... Yep.



## One Thought: Documentation...  Lots and Lots of Documentation

What is specified in a machine readable way can be processed by machines, and what can be processed by machines can be automated.

An interesting case of API interface documentation occurs with [Elm packages][elm-package]: Because Elm is statically typed, it can automatically generate API diffs between versions, and in fact this is made an explicit part of their package management system.  (It it perhaps more interesting that it is made an explicit part of their strategy rather than that they do it.)

With Javascript, things are not so fortunate, of course.  Everything is potentially dynamic, especially cases where variadic functions are involved.  Fortunately, we don't need to worry about that for REST APIs.


### Documenting REST APIs

One standard that seems to have quite a bit of steam behind it for REST APIs is [Swagger/OpenAPI][swagger], to the point that [even MuleSoft with RAML threw in with them][mulesoft-joined-openapi].  There are reasons for why listed in there, but all I really care about is that Swagger is the format used by OpenAPI.

How do you use this to create versioned APIs, then?  Painfully, but hopefully less painfully than doing it manually.

#### First Thought: A Swagger Doc Per Version

My first thought is this:
- Use a single Swagger doc per version of your API.
- In the Swagger docs, use a custom key to specify what controller method is being called.
  - NOTE: This means if an endpoint changed its interface you must specify a new controller method!  Probably something like `foo.0_0.js` and `foo.0_1.js`, etc.
- Use tooling to autogenerate your server's routers based on the swagger docs.
  - It should do things like:
    - Add deprecation notices
    - Create each endpoint per version
    - ... and stuff!

Some results:
- You will have a lot of swagger docs.
- They will all be big, and only ever get bigger.
  - Though, you could implement a scheme where each one describes only diffs from the previous one.  Not sure that's so good, though.  Requires some thought.



[elm-package]: https://github.com/elm-lang/elm-package#elm-package
[swagger]: https://swagger.io/
[mulesoft-joined-openapi]: https://swagger.io/blog/news/mulesoft-joins-the-openapi-initiative/
