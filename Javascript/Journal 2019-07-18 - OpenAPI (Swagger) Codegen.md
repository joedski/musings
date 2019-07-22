---
tags:
    - openapi
    - codegen
    - typescript
summary: >-
    Dev journal for my first time doing codegen from a swaggerdoc for requests in a UI project.
    It's not hard per se, I just need some place to keep my thoughts while doing it.
---

Journal 2019-07-18 - OpenAPI (Swagger) Codegen - Client Request Definitions
========

> NOTE: I use "Swaggerdoc" and "OpenAPI Doc" interchangeably here.

Initial thoughts:

- Have a script to download the swaggerdoc from any APIs we're targeting and generate code for the client:
    - Requset Definitions
    - Payload Validation
    - Types of Parameters and Payloads
- Template or programmable customization.
    - After all, projects are going to differ, slightly or significantly, in how they structure their requests.  This is especially the case for projects with any amount of legacy code.

Not sure if it will be much more complex than "Download doc, iterate endpoints, write using specified module or template".  Or, rather, hopefully it won't be more complex than that.  Again, simplicity/obviousness is its own reward.

> ~~Okay, there's one complication that immediately comes to mind: We have SSO at our organization and our API's own swaggerdoc is behind authentication, so first I'll have to figure _that_ out.  I should probably make that a separate journal just because it's not actually related to the codegen thing here.~~
>
> UPDATE: Looks like the Swaggerdoc path itself doesn't require auth.  Nice.



## Where Are the Docs Served Up From?

> Answer: `/v2/api-docs`, as also indicated in [this StackOverflow answer](https://stackoverflow.com/a/26722686)...
>
> Also the UI for more immediate poking at `/swagger-ui.html`.

The first thing I need to do is actually find out where the docs are served up from.  I meant to ask the API Dev but they're currently out, and I've got a few minutes between things, so time to start poking the API repo I guess.  I'm not actually familiar with how Swaggerdocs are usually setup in SpringBoot applications, but there's probably a Bean for that because Spring plays for all the Beans.

- Our API is a SpringBoot app.
- Going to the entry point, cleverly named `Application.java`, I see a few things that stick out:
    - A method (annotated `@Bean`) `public Docket api()`.
    - An annotation `@EnableSwagger2` on the `Application` class itself.
- I didn't see anything notable in the `Application#main()` method so I'm assuming it's setup via standard issue SpringBoot Magic™.
- I tried looking up [`Docket` docs](http://springfox.github.io/springfox/javadoc/2.7.0/springfox/documentation/spring/web/plugins/Docket.html) but that doesn't really tell me anything about where the docs themselves are served from, just what all they're building docs from.
- Next I tried looking at the [`@EnableSwagger2` docs](http://springfox.github.io/springfox/javadoc/2.5.0/springfox/documentation/swagger2/annotations/EnableSwagger2.html) which gave me a bunch more annotations: `@Retention()`, `@Target()`, `@Documented`, and `@Import()`.
    - The most interesting was the `@Import()` one which had the exact line of `@Import(value=Swagger2DocumentationConfiguration.class)`.  What's that class?
    - Take a look at [its docs](http://springfox.github.io/springfox/javadoc/2.5.0/springfox/documentation/swagger2/configuration/Swagger2DocumentationConfiguration.html), I see a bunch of other things.
    - Take a look at the `springfox.documentation.swagger.web` package, and see only 2 classes in there.  Well, `Swagger2Controller` is probably what I want?
    - Take a look at [said controller](http://springfox.github.io/springfox/javadoc/2.5.0/springfox/documentation/swagger2/web/Swagger2Controller.html) and see `DEFAULT_URL`.
    - What's that?  According to the [list of Constant Field Values](http://springfox.github.io/springfox/javadoc/2.5.0/constant-values.html#springfox.documentation.swagger2.web.Swagger2Controller.DEFAULT_URL), it's `"/v2/api-docs"`.
- Can I fetch `/v2/api-docs` from the Client?
    - Indeed I can!
- Can I curl it from the command line without auth?
    - I can!  Bonus!
    - It also seems to have to build the document every time, or at least takes a protracted amount of time to respond, so maybe don't do it that often?



## Swagger 2.0

There's definitely [differences between Swagger 2 and Swagger 3](https://blog.readme.io/an-example-filled-guide-to-swagger-3-2/), which is good to note going forward since at least on one project I'll be using Swagger 3, but for all my work on this codegen piece I'll be using Swagger 2.

Probably the biggest thing to me is how definitions are organized: In Swagger 2, they were all just plopped into top level keys like `#/definitions` (where the vast majority of things lived), `#/parameters`, and `#/responses`; whereas in Swagger 3 there are more categories, and they're all contained under the top level key `#/components`, so `#/components/responses`, `#/components/parameters`, `#/components/schemas`, etc.



## Prior Art

- [`openapi-generator`](https://www.npmjs.com/package/openapi-generator), which says it accepts 2.0 and 3.0 docs.
    - Worth investigating, definitely, it might even serve my need entirely.
    - If not, it may be something to at least pick through.
- [`dtsgenerator`](https://www.npmjs.com/package/dtsgenerator) which claims to generate `.d.ts` files.
    - Not all of what I want, but a big part of what I want.
    - Perhaps I can delegate the generation of all the types/interfaces to this and focus purely on the client codegen work?
- [Swagger Godegen](https://swagger.io/tools/swagger-codegen/)
    - Has a JS Client codegen, though I'm not sure if it's quite what I'm looking for.
    - Still, need to take a look at least.

And a casual search doesn't turn up much else.  Most things are geared towards scaffolding server projects.  Ah well.  Theoretically (heh) it's just iterating over each `paths[HttpMethod]` entry and generating a Request Creator, or whatever else I'm doing for client-side requests.
