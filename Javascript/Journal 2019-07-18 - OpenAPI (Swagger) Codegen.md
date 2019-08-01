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

And a casual search doesn't turn up much else.  Most things are geared towards scaffolding server projects, too.  Ah well.  Theoretically (heh) it's just iterating over each `paths[HttpMethod]` entry and generating a Request Creator, or whatever else I'm doing for client-side requests.



## Considerations

So, in an ideal world I could work with the API dev to make everything perfect, but that's not always the case.  I have a set of considerations that need to be dealt with, in part because the API dev may not always have time to fix things, may not care, or the project may have been orphaned.  At least there's still an OpenAPI doc!

- Sometimes fields that are known to be Enums are only Strings.
    - So, maybe a way to specify that a certain property (if present) on a certain scheme should have a certain Enum which is defined on another schema.
        - Or perhaps just overriding the Schema at a given path?  Then I can just specify it to be `{ $ref: "..." }`.
            - How specify which thing we're replacing, and what we're replacing in it?
            - Should also probably emit a warning if it's unused or an error if the target path doesn't exist, since that usually means the schema returned by the API changed.
    - Also, note that the enum isn't defined globally as some Property Schema, it's usually defined inline.  Another imperfection that has to be dealt with.
- I might want to add relevant docblocks to some fields of some types/interfaces.
    - Again, this requires being able to refer to both a generated type but also to a path within that type, though in this case probably mostly object properties.
        - I think this can be implemented by being able to merge extra props into a schema, and just adding `$comment` or `description`, probably the latter.  In my case, it'd be commonmark because TS tooling seems to like that.
- ... others?  I'll write them here as I get to them, I guess.

Basically, while I want code to be nice and tidy and organized, some things may require a bit of (potentially fragile) overriding to keep type safety and make things easier to manage on the client.

So far, there seem to be these basic operations:

- Selection: Select a given Schema and a Path within it.
    - Since we're working with an OpenAPI Document which is just a JSON file, we should be able to use some common pathing thing to get to it.  Maybe even a JSON Reference, though that makes entering the endpoint paths ... interesting.  Hm.
- Replacement: Replace the Selected JSON with the given JSON, possibly using values from the Selected JSON.
- Merging: Merge the given JSON with the Selected JSON.

This would cover most of my use cases, and pretty much acts as a pre-processing step before codegen.


### So, YAML?

It seems like YAML would be an easy way to specify things:

```yaml
operations:
    - replaceJson:
        at: "#/paths/ENCODED_PATH_HERE/responses/200/content/APPLICATION_JSON"
        with:
            $ref: "#/components/schemas/Foo"
    - mergeJson:
        at: "#/components/schemas/Bar/someProp"
        with:
            description: >-
                Description in commonmark for `Bar.someProp`.

                You can put in whatever formatting you want.
    - copyJson:
        at: "#/components/schemas/Bar/someEnum"
        to: "#/components/schemas/SomeEnum"
    - replaceJson:
        at: "#/components/schemas/Bar/someEnum"
        with:
            $ref: "#/components/schemas/SomeEnum"
```

though you could use JSON if you wanted, but then you lose text blocks, which is stupid.

Best part is, it's just using JSON paths so it's OpenAPI version-agnostic.  In fact, it doesn't even care if it's an OpenAPI file, it's just a JSON processor.


### Prior Art?

This seems like such an obvious thing that surely someone's written something at least _like_ this.  Specifically, something that takes a set of operations and performs them in sequence on a given JSON file.

- [jp](https://www.npmjs.com/package/json-processing) which as it says combines [yajs (Yet Another JSON Streamer)](https://github.com/tsouza/yajs) and RxJS to make a JSON processor.
    - Not what I'm looking for at all, actually, but very neat.
- [jsonata](https://www.npmjs.com/package/jsonata) also looks really cool, but seems to be geared towards the same sort of things as jp, albeit with its own operators rather than RxJS's.
- [dot-object](https://www.npmjs.com/package/dot-object) seems the closest so far.
    - Can move props: `dot.move('src.path', 'target.path', obj)`
    - Can delete props: `dot.delete('target.path[1]', obj)`
    - No merging, or at least no easy merging, that I could tell.  Can only seem to copy one prop at a time.
- [jsonapter](https://www.npmjs.com/package/jsonapter) is a template-driven JSON Transformer.  Not really what I'm looking for, but it looked neat.
- [json-shaper](https://www.npmjs.com/package/json-shaper) sort of a simpler dot-object/jsonapter made for transforming arrays of flat objects.
- [object-transform-stack](https://www.npmjs.com/package/object-transform-stack) seems to be close at first glance, but is really more like jsonapter than the word "stack" implies, at least to me.
- [shape-json](https://www.npmjs.com/package/shape-json) seems to be geared towards defining object-denormalization templates.  So, like `json-shaper`, actually.  Amusing, given their names.
- [json-transforms](https://www.npmjs.com/package/json-transforms) looks pretty slick for transforming arrays of objects, but again isn't what I need.

Ah well.  The use case is probably too specific.  Tiny one-off thingy it is, then.  That's annoying.  Yet another thing for us to maintain.

Better keep it as simple as possible, then.
