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
    - Request Definitions
    - Payload Validation
    - Types of Parameters and Payloads
    - A check for if the OpenAPI doc currently being served matches the one used for codegen
        - Note that this should at best generate a warning, it doesn't necessarily mean things will break.
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

Although, having said that, `$ref`s have the whole path, I'm not sure the actual structure matters that much.  Just be able to resolve the paths and we're good.



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

> Aside: While some of the modifications we might want to make are just for the sake of the client, some are things that should really be brought up with the API Dev if you have access to them, since you might be covering for inconsistencies in their API.  Of course, some of those inconsistencies may be irreparable or due to deprecated code, so, there's that too.
>
> And of course, always be careful modifying things you don't control.


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

Ah well.  The use case is probably too specific and limited.  Tiny one-off thingy it is, then.  That's annoying.  Yet another thing for us to maintain.

Better keep it as simple as possible, then.  Maybe keep it a personal library I can reuse?



## What's Generated Per Request?  What's The Target Output?

- To start, I'm going to be outputting _Request Creators_, which is to say functions which create a mildly extended Axios config.
- These Request Creators include _Validators_, which either output the validated object or throw.
    - In this specific case, I'll be doing validators which either return the input validated as the type, or throw, because of prior decisions made possibly due to the inferrence abilities in older versions of TS.
- These Request Creators naturally must have _Parameters_, some of which may be optional.
- These Request Creators necessarily will have _Types and/or Interfaces_.
    - Some of these will be defined at the point of use, the Request Creators themselves.
    - Others, mostly those defined in `#/components/...` (or, more generally, anything which uses a `$ref`), will be placed in their own files for reuse across many files.

Some constraints:

- To keep things simple for now, any type not defined by a `$ref` will receive an inline type or at least an interface local to the Request Creator.
    - `$ref` types will receive their own file, since presumably they'll be defined in `#/components/...`.



## On Overrides: An Easier Way

Probably the easiest way to do overrides is to not bother with fancy config things, but rather to just provide preprocessor functions: For each thing being generated, you receive a description of it and can return a new description (or mutate the existing one, it's all good here.)

From there, you can really implement whatever you want.  Config driven modifier?  Knock yourself out.  Path-Based Module-Auto-Loader?  Go for it.

That really makes it a matter of simple function composition, then.  It's functions all the way down.  Or classes if you're Java, but anyway.

This also suggests an implementation model: each kind of codegen is just a separate function that emits any number of paths + contents.  I guess that means it's kind of a gulpish thing.  Heh.  So, for the above, just do 3 codegen modules: request creators, definition types, validators.  Each module is free to share common code of course, but you have 3 entry points.

Nice.


### What's Needed Per Request for TS Request Config Creators?

In my current project, each endpoint gets a corresponding request config creator that looks something like this:

```typescript
import createAppRequest from '@/src/requests/createAppRequest';
import ICreateFooRequest from '@/src/requests/interfaces/ICreateFooRequest.interface';
import ICreateFooResponse from '@/src/requests/interfaces/ICreateFooResponse.interface';

export default function postCreateFoo(params: {
    request: ICreateFooRequest;
}) {
    return createAppRequest.post(
        '/foos',
        params.request,
        {
            validate: (v: unknown) => assumeType<ICreateFooResponse>(v)
        }
    );
}
```

We have a number of things needed, then:

- Relative Output File Path
- Interface imports
- Function name
- Params (will include path, body, and query)
- HTTP Method
- Path, including any path arams
- Which param is the body param
- Request Options:
    - `validate` option: Success Response Type(s), if any
        - Used for paramtrizing `validate` option.
    - `params` option: Query params, if any

Should also be able to hold errors and warnings.

- Errors should be used to block generation of a given Request Config Creator.
- Warnings should not block generation, but should still be loud.

Some other things that should probably be added:

- Docblock text: sometimes it can be nice to have some extra information.

With all those things, we can then add further transforms that will conditionally act on the above created things.  Types themselves will still be specified using JSONSchema since that's well defined, but we'll need special wrappers for TS Utility Types.  Mostly `Parttial<T>`, though.


### Typescript Utility Type Schemas

I want some way to explicitly mark a type as `Partial<T>` or `Required<T>` or `Readonly<T>` or whatever.

The quickest way I can think of is to just create a specific type for each one:

```json
{ "type": "ts", "tsPartial": { "$ref": "#/definitions/Foo" } }
```

```json
{ "type": "ts", "tsReadonly": { "$ref": "#/definitions/Foo" } }
```

and so on.

Another way would be to just use a name and arguments.  This would be generic and allow for, well, darn near anything.

So, using `Partial<T>` would look like:

```json
{
    "type": "ts",
    "tsGenericType": {
        "name": "Partial",
        "params": [
            { "$ref": "#/definitions/Foo" }
        ]
    }
}
```

And using `Omit<T, K>` might look like:

```json
{
    "type": "ts",
    "tsGenericType": {
        "name": "Omit",
        "params": [
            { "$ref": "#/definitions/Foo" },
            { "enum": ["A", "B", "C"] }
        ]
    }
}
```

Anything more exotic would probably require some sort of custom implementation that I really don't feel like thinking about right now.  Something built with `lodash.template` I guess.

```json
{
    "type": "ts",
    "tsTemplate": {
        "template": "keyof <%= type %>",
        "schemas": {
            "type": { "$ref": "#/definitions/Foo" }
        }
    }
}
```


Either that or just manual stringy stuff, where you can specify a string for raw output and a schema for any other type.

```json
{
    "type": "ts",
    "tsRaw": [
        "keyof ",
        { "$ref": "#/definitions/Foo" }
    ]
}
```

The latter is easier to write, but harder to read.  The former is significantly noiser to write, but the template itself is easier to read.

Given they'd both be gated behind functions, I'm not sure it really matters ultimately which one is used, the end user devs don't see them.



## Defining Exceptions

> NOTE: I think I need a better name than "Exception".  That calls to mind errors, what with that name being actually used in Python.  "Irregularity"?  "Workaround"?  "Hax"?  "Suboptimality"?

So, as noted elsewhere, in my current project the backend's OpenAPI doc isn't quite perfect for our needs:

- Some properties can actually be omitted from request payloads and the backend will fill them in with reasonable defaults.
    - Or in some cases they'll actually be ignored or aren't used...
- Some properties somehow lose type information.
    - Some enums devolve to just `{ "type": "string" }`
- Enums are never placed in the OpenAPI Doc Definitions.

Because of that, currently we do this:

- When rendering an object schema to a TS Interface, assume all properties are required (`"requiredProperties"` has every key in `"properties"`) unless specified otherwise.
    - That is, if there's no `"requiredProperties"` present, treat the schema as if it has a `"requiredProperties"` with every key in `"properties"`.
- Manually move some enums out to actual `enum` declarations and replace the inline types with references to those enums.

Now, currently these will be pretty common in our codebase, but it would be nice to actually not have to do this.  As well, the exceptions are, well, exceptional.

So, when defining an exception, we should also define what it is we're replacing.

Also, for general things like the `"requiredProperties"` thing we should only warn once since otherwise that would get excessively noisy.


### Exception Guards

Ideally, what would happen is this:

- The guard is just a partially specified schema.
- If the guard matches part of the schema, you get to transform just that part.
    - Which would be just the part you specify in the guard, which is a const value.  So, actually you don't even need that, you just return a new thing.
    - But, being able to operate on a clone of the input would be nice, since you can then just mutate only the parts you need to and return that.
- The transformed part then is used to patch the original before processing.
    - I don't know how this part might work, it's kinda not well defined.  Maybe something like "deleting anything that matches this then merging the transformed in"?
    - Maybe get one of those object diff algos, create a diff from the guard to the transformed, then apply that to the actual document?

```js
const exc = defineEndpointException({
  // This matches the current internals better.
  whereEndpoint: {
    path: "/foos/{foo_id}/bars",
    method: "get",
    schema: {
      // ...
    }
  },
  // or maybe just this?  This matches the raw document better.
  whereDoc: {
    paths: {
      "/foos/{foo_id}/bars": {
        get: {
          // ...
        }
      }
    }
  },
  // Most work should be doable here.
  transformSchema(schemaSlice) {
    // ...
    return schemaSlice;
  },
  // But, just in case, we should have this too.
  transformDefinition(endpointDefinition) {
    // ...
    return endpointDefinition;
  },
});
```

That looks pretty good to start with for endpoints.  Definitions/interfaces should be similar, but probably not quite as complex because they're just schemas?

```js
const exc = defineDefinitionException({
  // Like the first option above, more closely reflects
  // what happens internally.
  whereDefinition: {
    name: 'Foo',
    schema: {
      // ...
    },
  },
  // More general...
  whereDoc: {
    definitions: {
      Foo: {
        // ...
      },
    },
  },
  transformSchema(schemaSlice) {
    // ...
    return schemaSlice;
  },
  transformeDefinition(definitionDefinition) {
    // ...
    return definitionDefinition;
  },
});
```

Also makes me wonder just when they get applied, or just when they error.

- The `whereEndpoint` and `whereDefinition` guards are much easier to error on:
    - You can first select by the name or path+method, and yell if they don't exist.
    - Then you can check if the input matches the given schema, and yell if there's a mismatch.
- The `whereDoc` ones are much more general, allowing you to arbitrarily test the document.


### Generating Enums

These are a bit harder.

- Currently, the way to do this is basically to pick an existing enum schema and generate the values from that.
- Then, we replace the enum schemas with that enum name.

This is already hacks upon hacks, so probably what we'll want to do is something like:

- Guard: check that certain objects have properties matching a given schema.
- On success:
    - Generate a new file which is just that enum.
- Other Exceptions will just assume the enum is generated successfully?
    - Either that or we replace each target schema with a reference to the enum before any codegen takes place.

Hm.

We could do something a bit more interesting for this with Definition Exceptions, then.

```js
const exc = defineDocumentException({
  whereDoc: {
    paths: {
      "/foos/{foo_id}/bars": {
        get: {
          // ...
        },
      },
    },
    definitions: {
      Foo: {
        properties: {
          someEnum: {
            enum: ['foo', 'bar'],
          }
        }
      }
    }
  },
  transformDocument(documentSlice) {
    const enumName = 'SomeEnum';
    const enumRef = () => ({ '$ref': `#/definitions/${enumName}` });

    // Define our enum schema.
    documentSlice.definitions[enumName] = {
      // flag it explicitly?
      tsEnum: true,
      enum: documentSlice.definitions.Foo.properties.someEnum.enum,
    };

    // Patch the document.
    documentSlice.definitions.Foo.properties.someEnum = enumRef();

    return documentSlice;
  },
});
```

Hum.

- I have `tsEnum: true` in there because the current default behavior when creating types from enum schemas is to create an inline type union.
    - I want to maintain that default behavior, so need some way to opt out of that.
    - Then again, maybe the Definition Codegen module handles top-level enums differently from non-top-level enums?  That may be all the difference: You can't define a TS enum inline, you can only define them when you declare them which requires a statement. (as opposed to expression)
- This is a bit broader than other definition exceptions: it transforms the entire document rather than just the schema for a given type.
    - In light of that, I've renamed it `defineDocumentException`.

I suppose one could do something funky to semi-automate it?  Mmmm, not sure if I want that.

```js
const exc = defineEnumException({
  whereEnum: {
    values: ['foo', 'bar'],
    document: {
      // ...
    }
  },
  enumName: 'SomeEnum',
});
```

Ugh.  That's starting to get a bit noisy is the problem there, though admittedly the vast majority of cases should exist in `#/definitions` rather than anyhwere else in the document, so there's that much at least.

In which case maybe we just have a set of values and paths?

Also, not much we can do about strings.

> UPDATE: Also, rather than Exception, probably use Workaround.  Exception is used by other languages where JS uses Error, but it's still too close to those that it can cause crossed wires.  That and Workaround feels closer to what's being described.


### Should Schema and Document Transforms be Separated Logically From Codegen Definition Transforms?

I'm starting to think so.  They're applied at different points, so using one interface for two different places seems weird.  I think that would also make the guards a bit easier to deal with, possibly.  Maybe.  Maybe not.



## First Updates From Initial Implementation

After actually playing around with implementing some of these things, I've found that a few stages naturally emerge:

- Pre-default-operations: used to apply any necessary modifications to the original JSON document slice.
- Post-default-operations: used to apply any overrides to the codegen record itself that can't be done in the JSON document slice.
    - Most of the operations I can think of can be done at the pre-default-operations stage, though, so I'm not sure this is necessary.
- Post-default-checks: used to apply any additional checks, though I don't know that there necessarily will be any.
    - Most of the current ones can probably be handled as default checks, and could even be applied before actual default-operations.

I separated record creation and record population just because I didn't want to think about anything there, but that does lead to the annoying case of having to define default values.  That's fine, though, it made the operations themselves easier to write.

I implemented operations as mutations rather than pure functions, though there's strictly speaking no reason either has to be preferred.  That said, a lot of mutation will be outright replacing things with new data, so it's kinda both, but any mutation means everything must be assumed to be mutation, so there's that too.

Of course, I could do a deep clone of everything to guarantee mutations don't leak out past operations on a given item, and when doing any mutations to JSON documents I'll want to start with that so that the original document itself isn't mutated, but otherwise yeah.


### On Suppressing Notices

It might be useful to suppress notices that you know won't actually affect things.  In this case, an additional "check" could be implemented that removes certain notices.

One thing that might make this easier is to just explicitly declare types of notices (notice prefabs), or at least define constant values that can be used to identify those kinds of notices.  After that, metadata extraction will have to be done somehow too.  Maybe a nullable getter?  Hm.  That's starting to get annoying.  Exporting an interface for item specific metadata might be enough.


### Do We Need So Many Hooks When We Can Augment The Schema?

Given that we're already augmenting the schema with additional Typescript specific things, or import/export symbol information in the case of `$ref`s, do we really need all the hooks?  We can just add new "validation" keys that do and express whatever we need.

Something to think about, certainly.

It's probably still prudent to include the option to specify processing and checks at other points just to cover all cases.  And, if the list of operations is defined as an array of individual ops, then there's no real need for hooks at all because, well, you define everything that goes in.

Honestly that's probably what the first version will do.  No need to get fancy.

#### What About Validation?

Since we're using Typescript, we're delegating validation of data sent to the server to the type system/compiler and developer diligence.  That leaves validation to just data we receive from the server, though theoretically that shouldn't be necessary, and hasn't been necessary yet.  While this is possible to add, it's not something we're quite interested in just yet.

Supposing we did want to do this, if for no other reason than to issue warnings when the server sends something different so that we know something's up, do we need to do anything now that would make this possible?  Reduce future friction?

Would any of the processing steps affect this, and if so what might we want to watch out for?

I think for the most part, the response types aren't touched, nor have they needed to be touched.  In fact, the vast majority are `$ref`s, though the types themselves that are `$ref`ed could be altered during their processing steps.

Easiest might be to redo the Typescript things to be adjunct keys rather than their own keys.  Things like Partial and Required would trigger certain things during codegen but otherwise not affect AJV.  Some of our transforms could even be things which produce a different schema, but still implementing the desired TS behavior in pure JSON Schema.

Practically speaking however, I think most of the TS things are going to be used in things that the Client handles or sends, rather than things that the server sends.

That is, most TS related things will be in:

- Request creator parameters
- The Request Body specifically in some cases
    - A number of create/update entity requests don't require the client to send the whole thing, some data which the client doesn't have in the first place anyway

So yeah.  That's something.



## Implementing Overrides: Workarounds

I'm going to use the term Workaround since it's both distinct and descriptive.

I don't even know what language to create for defining these, so I'll follow the old tried and true: Implement a few manually and see what patterns fall out and what things are actually important and what aren't.


### On Composing Workarounds

Workarounds as presently defined (see the later section _Accounting for Unused Specific Workarounds_) two major components and one primarily for later diagnosis:

- Name: the name of this workaround.
- Test: optional test for whether or not this workaround should attempt its operation on the current record.
- Operate: actual operation to perform on the current record.

The thing of course about writing workarounds, especially when dealing with schemas, is that JSON Schema keys are all optional.  Their values aren't, but the main validation keys are all optional.  This means you have to validate every single access and, in the case of codegen, (usually) set notices when you can't access something expected.

There's a few operations I've run into so far that are used multiple times:

- Update a Specifically Named Property Schema of an Object Schema.
- Update the `required` key of an Object Schema.

There's a couple ways I can think of to do this:

- Define Schema Alterations as a distinct Workaround that accepts two parameters: Record and Schema.
- Pass an altered Record to the sub-Workaround.

In either case we need the Codegen Record because we need to be able to set Notices.

I'm leaning towards the former, where `AlterSchemaWorkarounds` are their own explicit thing.

- Pro `AlterSchemaWorkaround`:
    - Explicit is usually better.
    - Removes ambiguity about if you can use an `AlterSchemaWorkaround` as a `CodegenOperation`: you can't.
    - No faking out sub-Workarounds: the record is always the given record.
- Contra `AlterSchemaWorkaround`:
    - A wrapper is now always needed because an `AlterSchemaWorkaround` expects a Schema argument, but `Workaround`s are just `CodegenOperation` definitions whose operation doesn't have that second argument.

On the other hand, by defining them in terms of plain `CodegenOperation` definitions, you can just reuse known composition semantics.

- Pro `CodegenOperation`:
    - Composition semantics already defined.
    - Fewer concepts to juggle about.
- Contra `CodegenOperation`:
    - Faking out the sub-Workarounds: you create a fake record whose data is in some way unrelated to the rest of the record.
    - Not easy to use across both Type Definition records and Endpoint records, only the former has `schema` at the top level.

That last Contra point is probably the biggest point against trying to reuse `CodegenOperation` directly.

#### On Composition and Names

One of the points of all this malarkey around `CodegenOperation`, `AlterSchemaWorkaround`, etc, is that there are actual names everywhere to make it easier for a developer to track down exactly what workaround produced what message.  Composition then requires that the names are also composed.

Currently, I'm thinking:

- Operation Names should be just joined via `/`.
- Key/Name parameters should come after the Operation Name, in parentheses.

So, given this:

```js
const opDefs = workaroundsForDefinition('#/definitions/Foo', [
    alterSchema(requiredProps(['foo', 'bar'])),
]);
```

We end up with one CodegenOperation whose name is `workaroundsForDefinition("#/definitions/foo")/alterSchema/requiredProps(["foo", "bar"])`.  Better probably would've been to make `name` a `string[]`, but oh well.


### On Normalizing Composition A Bit Better

So, to compose two workarounds, you have basically have to compose three things:

- The name
- The test
- The operation

These composition operations should be defined on CodegenOperation, or on an adjunct util.  Regardless of where they go, what they do should be as follows.

#### Composing Names

This was already stated: CompName(A, B) should result in `${A.name}/${B.name}`.

#### Composing Tests

This one is simple as well: CompTest(A, B) should result in `A.test(record) && B.test(record)`.  A special case could also be defined if neither A nor B define a test: in that case, CompTest(A, B) results in no test.

#### Composing Operations

Since Operations were originally defined as only being mutations/side effects, not maps/transforms, this seems fairly simple: CompOp(A, B) should result in `A.operate(record); B.operate(record)` however that's not necessarily always the case.  A more general way would be to define how the composition occurs with a higher order function.

Basically, A would define its operation as actually `B.op => record => {...}` and would therefore decide how to go from there.

In practice, since the definition of a Workaround would itself be written in terms of the Codegen Operation Composition operator, it would control all of A and accept B as a parameter.  Thus in such a case we colud write A only in terms of HOFs.

#### Is That Necessary?

In more practical practice, this is confusing to read for many people, and honestly not really nceessary.  We can get really far by just writing an "operation description normalizer" so that we can accept anything and turn it into a `CodegenOperationOptions` object.

```js
function normalizeOperationDefinition(opDef) {
    if (typeof opDef === 'function') {
        return {
            name: opDef.name,
            test: null,
            operate: opDef,
        };
    }

    // If using TS types, then this is exhaustive.
    return opDef;
}

function compName(nameA, nameB) {
    return `${nameA || '[anonymous]'}/${nameB || '[anonymous]'}`;
}

function compTest(testA, testB) {
    if (testA && testB) {
        return function composedTest(record) {
            return testA(record) && testB(record);
        };
    }

    const definedTest = testA || testB;

    if (definedTest) {
        return definedTest;
    }

    return null;
}

// NOTE: No compOperate because it's too arbitrary.

function workaroundForDefinition(jsonRef, workaround) {
    const workaroundDef = normalizeOperationDefinition(workaround);
    return {
        name: compName(
            `workaroundForDefinition(${jsonRef})`,
            workaroundDef.name
        ),
        test: compTest(
            record => record.jsonRef === jsonRef,
            workaroundDef.test
        ),
        operate: workaroundDef.operate,
    };
}
```

What would the HOF form look like, though?

```js
function composeCodegenOperationDefinition(higherOrderOp) {
    return function comp(opB) {
        const opBNormed = normalizeOperationDefinition(opB);
        return {
            name: compName(higherOrderOp.name, opBNormed.name),
            test: compTest(higherOrderOp.test, opBNormed.test),
            operate: higherOrderOp.operate(opB.operate),
        };
    };
}

function workaroundForDefinition(jsonRef, workaround) {
    return composeCodegenOperationDefinition({
        name: `workaroundForDefinition(${jsonRef})`,
        test: record => record.jsonRef === jsonRef,
        operate: nextOp => nextOp,
    })(workaround);
}

// or...

function workaroundForDefinition(jsonRef) {
    return composeCodegenOperationDefinition({
        name: `workaroundForDefinition(${jsonRef})`,
        test: record => record.jsonRef === jsonRef,
        operate: nextOp => nextOp,
    });
}
```

Kind of a lot to keep in mind, I guess.  Concise, but not necessarily what I might consider idiomatic to Javascript.



## Making Notices A Bit Dev-Friendlier

It would be nice to automatically have the name of the operation that set a given notice in that notice so you don't have to try parsing a stack trace.  Probably the easiest way to do this is to use either a specific name, or to use `Function.name`.

Not sure if I should include an error code or something after that, but the operation name itself would at least go a long way to narrowing down where a given notice came from.



## Accounting for Unused Specific Workarounds

One thing that should be done as a matter of course is checking that a given specific workaround was actually executed at least once.

This requires either the given workaround itself tracking that, or else separating tests from execution.  I don't know what that'll look like yet, but it'll probably involve something with a `recordsAccepted` property or similar, where `undefined` is treated as `Infinity`, more or less.  Just has to be greater than 0.

A better option would be to change Workarounds from functions into descriptions, which are always more flexible but also require implementling a execution engine for.

The description would start out at minimum as:

```typescript
interface CodegenOperation<TRecord> {
    name: string;
    test?: (record: TRecord) => boolean;
    operate: (record: TRecord) => void;
    recordTestPassCount: number;
}
```

Then we wouldn't have to finagle `Function.name` with silly things.



## On Imported Generic Types

Currently, there's two different ways of handling types referenced by symbol name:

1. Imported symbols
2. Typescript Generics

Now, granted, there are two different things going on here:

1. Imported symbols are imported and referenced as is, but must be included in the Import Statements at the top of the file.
2. Generics are currently all assumed to be globally defined ones from the built in library of types that Typescript installs with.

But currently these are handled with entirely separate things.

Present examples:

```typescript
interface RefSchema {
    $ref: string;
    $refDefaultImport?: string;
    $refNamedImport?: string;
    $refNamedImportAlias?: string;
}

interface TypescriptGenericSchema {
    typescriptGeneric: {
        name: string;
        parameters: TypeSchema[];
    }
}
```

Could both of these be used together?  Is there some duplication?

One way this could be handled is by using `$refNamedImport` or `$refDefaultImport` to handle the `typescriptGeneric.name` which would leave just `typescriptGeneric.parameters`.  That's probably good enough, really.  Either that or we just ensure that `name` and `$refNamedImport` or `$refDefaultImport` both match.

I guess if we just change it to `typescriptGenericParameters`, flatten things out and just have the keys coordinate, then we can use `$refNamedImport` or `$refDefaultImport` over `typescriptGenericName` if those two are specified.



## On Nullables And Arbitrary Unions (And Intersections)

Probably the easiest way to handle a union is using the `oneOf` key.  Similarly, intersections can be handled with `allOf`.

Nullable then just becomes `{ oneOf: [originalSchema, { type: 'null' }] }`.



## On the SwaggerDoc Type

I've run into an issue where I'm operating on things pulled from the Swaggerdoc which must then be extendable with our custom schema stuff.

One way is to specify the Schema type as a type parameter.

So, `PartialOpenApiDocument<TSchema extends OpenApiSchemaObject>`.  Of course, that means all the other sub-types must also deal with that type parameter, but that's the same with any sort of parametrization.  Now, a possible issue is that I'm not sure my extended type (implemented as an alias defined as a union) is actually entirely assignable to `OpenApiSchemaObject`, meaning it would actually fail the constraint.

The better option, which requires rewriting some of the internal utils, would be to make my custom schema type a strict extension of `OpenApiSchemaObject`, following the JSON Schema thing of having all keys optional and not doing anything funny with requiring pairs.  By making all extensions optional, every extended schema is automatically assignable to the base schema type, and even vice versa!

> Technically, there are keys that only work in coordination with other keys, but the implementation of validation around such keys also requires defining behavior in the absence of any other keys.

I think I'll bite the bullet and go with the better option, that one's less noisy.

It also means changing all the various subset types to be strict subsets of that extended type, again with all props optional, or basically `Partial<T>`.  In fact, that might be a good way to do it, to guarantee such things are indeed strict sub sets.  If I don't have a given key defined, it'll tell me!

Then if I want to guarantee some things, I can just do `Required<T, K>`.  Mixed ones will require doing `Required<Pick<T, KReq>> & Pick<T, KOpt>` but there you go, I guess.

EDIT: Actually, `Pick<>` doesn't maintain optionality, though it does maintain the union with `undefined`.  Rather, you have to explicitly do `Required<Pick<...>> & Partial<Pick<...>>`.  Ah well.

On the plus side, this will make type predicates much easier to write.
