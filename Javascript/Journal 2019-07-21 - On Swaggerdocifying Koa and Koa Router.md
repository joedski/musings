---
tags:
    - functional-documentation
    - openapi
    - nodejs
    - nodejs:koa
    - nodejs:koa-router
---

Journal 2019-07-21 - On Swaggerdocifying Koa and Koa Router
=========

> See also [a journal on client request codegen from Swaggerdocs](./Journal%202019-07-18%20-%20OpenAPI%20%28Swagger%29%20Codegen.md).

I'd previously given a tiny bit of thought to [automatic param extraction](Journal 2019-04-28 - Extracting Params Automatably - Koa.md), though I didn't proceed very far in there, and it's really only helpful in my opinion if you sprinkle a bit of Typescript or Flow on it.  Something to give you hinting/autosuggestion.

Needless to say, I'm gonna do that.

However, there's another thing here, perhaps more important: Runtime validation of inputs and outputs, specifically as the document title implies with Koa and Koa Router.



## Concerns to Separate

We have a few concerns here:

- How do we specify the interface?  The shapes of the inputs and outputs?
    - Part of the answer is easy: SwaggerDoc Endpoint Schemas, possibly with some friendly JS flavored wrapping.
- Where do we specify the interface?
    - As close to the point of use as possible, but there are implementation details.
- How are we associating the interface with the target endpoint?
    - This depends entirely on the tooling we're using.  Koa + Koa Router gives some options, though.
- How do we execute the enforcement of the interface?
    - Probably most of the functional code goes under this question.
- Where do we execute the enforcement of the interface?
    - Two obvious choices: At the top-level, or at the point of use.
- How do we make the Endpoint Interface Specification visible to the global SwaggerDoc Generator?
    - Koa and Koa Router thankfully keeps all their "Layers" inspectable, so you can just introspect at runtime.


### Concern: How Do We Specify the Interface?

This is, in some ways, one of the easiest parts to answer: The interface is specified using a SwaggerDoc (OpenAPI Doc) Endpoint Schema.

Why?

- JS has no notion of types in the same way, say, Java does, so you can't just introspect classes to build object creators.  Instead, that translation has to be explicitly defined.
- I ultimately want to output a SwaggerDoc for our API Server, so if we have to specify everything anyway, might as well make it close to the final output, or a thin wrapper therearound.


### Concern: Where Do We Specify the Interface?

As noted before, _we want to co-locate the interface with the rest of the endpoint definition, which here means "where we're setting up our Routers"._  So, at each Route Definition we'll end up with both an Endpoint Interface and a Controller Method.  At the very least, now we don't need to actually call the Controller Method manually, we just have a thingy that calls it for us.

In one app I'm working on, we have to actually wrap the Controller Method because we're not exposing the Request Context to it, but rather extracting parameters and passing only those to the method.  Otherwise, the Request Context tends to leak into places it really shouldn't go, and at that point there's no real reason to pull parameters off it.  That caused issues in previous projects and everyone on the team decided that it was better to avoid that.  On the plus side, then, everything actually has specified interfaces, i.e. documentation, which is a Good Thing.


### Concern: How Are We Associating the Interface With the Target Endpoint?

This is related to the previous concern, but a bit more implementation centric.

In our specific case, we're using Koa Router to handle routing of requests to endpoints.  However, our Controller Methods are deliberately setup to avoid taking the Request Context.

So, instead, what we'll do here is:

- We'll have a Wrapper which takes our Interface Specification and the target Controller Method, and outputs a Middleware Handler.
- This Middleware Handler is then used as the Route Handler for the given Method + Path.

Easy.


### Concern: How Do We Execute the Enforcement of the Interface?

Since this is dealing with execution, it's also dealing with implementation, which means details!  Yaaaaay.

We have two places we have to worry about:

- The Inputs: Request Parameters (be they on the body, in the path, or in the query)
- The Output: The Body

If I were dealing with passing the Request Context on to things, I might have to do something like wrapping the Context using `Object.create` to treat the original Context as a prototype so I can override the `body` setter in a clean way.  Here though I'm just calling another function, so it's entirely irrelevant to that function how we deal with the Context.  (mostly...)

So, all that happens is that, for the target endpoint, we try extracting and validating each specified parameter and, if some fail, report back with "Bad Request".  Then, if it succeeds, we shove those into the Controller Method and wait for it to return.  When it returns, we walk over the response and set the appropriate response bits.  Usually it's just a body, but sometimes there could be a different status code, cookies to set, and other sundry things.

Since we're just wrapping a function, it's easy to do all that.  Functions are great.


### Concern: Where Do We Execute the Enforcement of the Interface?

This has the potential to be a somewhat interesting question: We could execute it only at the top level, or we could execute it at each endpoint handler only.

I'm going to go with the latter in this case, though:

- Executing it at the top level requires wrapping the Request Context, likely in a manner as described above, in order to defer actually sending the response until the Body is validated.
    - This is something else that we would have to do, and something we ultimately _don't need to do_.  So, unless there's a real benefit, don't bother.
- We're already wrapping each Controller Method anyway, since Controller Methods in this Application don't themselves accept the Request Context.  On top of that the Wrapper already is what takes the Interface Specification, which makes it an obvious place to do these things.
    - Thus: _Might as well just have the execution at the wrapper._
- No need to determine route resolution twice.
    - A minor thing, but if we did it at the top level we'd have to somehow determine route resolution twice, which honestly would probably just be by asking if a router would handle a given endpoint.
    - However, there are edge cases such as endpoint handlers punting on the request which we would have to account for.  Ultimately, this means more complication.  No thanks.

Simple means more maintainable.


### Concern: How Do We Make the Interface Specification Visible to the Global SwaggerDoc Generator?

As noted, the Koa App and Koa Router instances hold all their layers and route definitions on properties attached to themselves, which means we can inspect them later and do things based on them.  For our case, this means we can iterate over things to look for metadata (gosh, almost like Java decorators...) and from there build our full SwaggerDoc.

Naturally we'll have some digging into details to do there, but ultimately the above outline is how we do it.  Simple enough.  (heh)



## Implementation Drafting

I've got a few things to do here:

- [ ] Review how SwaggerDocs specify Endpoints.  Kinda need to know this.
- [ ] Review prior art.
    - While checking out Koa specific things might be good, there's also just general utilities.
        - Since JSON Schema is used, AJV is going to be inevitable, but anyway.
    - [ ] Koa + Swagger Tooling
    - [ ] General Node JS Swagger Tooling
    - [ ] JS JSON Schema Swagger Tooling
- [ ] Start iterating on a good interface to apply this, noting that abstractions are only useful if they actually provide _long term_ productivity gains.
    - Saving a few lines for the sake of saving a few lines is a _short term_ productivity gain.  Making the code read closer to the intent is a _long term_ productivity gain.
    - Bonus points for Typescript support.


### Review of SwaggerDoc Endpoint Specification

I mean, I'll be reviewing the whole Swaggerdoc shape, but most immediately I need to know the Endpoint Specification itself.

Endpoints go under the `paths` root key:

```yaml
openapi: 3.0.0

info:
  title: Sample API
  description: Optional multiline or single-line description in [CommonMark](http://commonmark.org/help/) or HTML.
  version: 0.1.9

servers:
  - url: http://api.example.com/v1
    description: Optional server description, e.g. Main (production) server

# paths go here.
paths:
```

For example:

```yaml
paths:
  /users:
    get:
      summary: Returns a list of users.
      description: Optional extended description in CommonMark or HTML
      responses:
        '200':
          description: A JSON array of user names
          content:
            application/json:
              schema:
                type: array
                items:
                  type: string
    post:
      summary: Creates a user.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                username:
                  type: string
      responses:
        '201':
          description: Created
  /user/{userId}:
    get:
      summary: Returns a user by ID.
      parameters:
        - name: userId
          in: path
          required: true
          description: Parameter description in CommonMark or HTML.
          schema:
            type: integer
            format: int64
            minimum: 1
      responses:
        '200':
          description: A user object.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '400':
          description: The specified user ID is invalid (not a number).
        '404':
          description: A user with the specified ID was not found.
        default:
          description: Unexpected error
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
          format: int64
          example: 4
        name:
          type: string
          example: Jessica Smith
      required:
        - id
        - name
```

> Aside: I like the stipulation that they use CommonMark.  It's a small thing, but never the less makes me happy.

> Aside 2: The above example is in YAML, but both that and JSON will ultimately parse to the same thing, unless you use any YAML specific weird bits.

For more, see these handy dandy pages:

- [Describing Parameters](https://swagger.io/docs/specification/describing-parameters/)
- [Describing the Request Body](https://swagger.io/docs/specification/describing-request-body/)
- [Describing Responses](https://swagger.io/docs/specification/describing-responses/)

Anyway, since this is specifically about SwaggerDocs (with an eye towards TS type generation) any tooling developed should either just use SwaggerDoc stuff or be thin wrappers around it.  I mean, why bother creating a whole separate type system and syntax if the main goal is a SwaggerDoc?


