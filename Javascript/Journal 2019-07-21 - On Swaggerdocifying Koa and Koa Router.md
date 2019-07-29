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


### Things We Get For "Free" (From Koa Router)

While we do have to specify most of the things for each endpoint, there are a few things we get for "free" because we already specified them by just calling Koa Router's various methods and specified things:

- The Path, though it needs to be reformatted into an OpenAPI path string.
- The Path Paremeter, at least their names.

Okay, so not actually that much:

- We still need the Type of each Path Parameter, though it's really just gonna be either a string or number.  Maybe boolean but that's madness.
- No Query Parameters.
- And of course, no Body.


### Existing Tooling, Prior Art

Basically anything JSON Schema is going to use something like AJV so there's that much.

Most of what I'm concerned about then is:

- Creating a Koa Middleware Handler that validates the IO.
- Creating a ... thingy that creates the OpenAPI Doc for the whole API, based on what endpoints are floating around.
- Plugging into any existing SwaggerUI thingies available.


#### Koa Router Stuff

Just tooling around Koa Router, not specific to anything else.

- ... there's not much, really.  About the only problem I think is that Koa Router's route resolution can be somewhat ideosyncratic and you actually do have to worry about the ordering of your routes.
    - EDIT: As of 2019-07-28, I see [this will be fixed in 8.x](https://github.com/ZijianHe/koa-router/issues/231).  Not good at the moment, but there's that I guess.
        - Also, Koa Router 8.0.0 has been published as of this date.
    - Anyway, Koa Router doesn't provide a public API for iterating layers, which is annoying.  It means it could theoretically change between versions, and may very well change between 7 and 8.

#### Koa Stuff

Here's some things I went through.  While I found [something](https://www.npmjs.com/package/express-ajv-swagger-validation) that might work for the validation part, the way I want to just add docs as a wrapper around the controller method call at each endpoint doesn't really exist.  So, I'll have to make that, I guess.

- [koa2-swagger](https://www.npmjs.com/package/swagger2-koa) Some tools for taking an OpenAPI v2 Doc (no v3 I guess.) and validating all the things.
    - This is certainly something to look at, but I'm more interested in what's basically a middleware applied at the endpoint rather than something that wraps the Router itself.
- [koa-openapi](https://www.npmjs.com/package/koa-openapi) seems a bit closer to what I want.
    - Nomenclature note: They define Operations and Services.  The Operations thing are what I refer to as Controller Methods.  Otherwise it's about the same.
    - I'm not sure I understand their setup with regard to path variables, though.  Maybe they treat dirnames as path vars if your `operations.VERB.apiDoc` says the element at that position (with matching name?) is a variable.
        - Nope, [you just name them `{var-name}/` or `{var-name}.js`](https://github.com/kogosoftwarellc/open-api/blob/34c539f6d41304d96106b40fd20a4b7e7cfe895d/packages/koa-openapi/test/sample-projects/basic-usage/api-routes/users/%7Bid%7D.js).  Not sure how I feel about that.
- [express-ajv-swagger-validation](https://www.npmjs.com/package/express-ajv-swagger-validation) is a singleton-export that you init with your OpenAPI Doc then sprinkle the `validate` middleware on all your routes you want to validate.
    - Could be a thing to use.  I'll have to try it.  If it works, that'd leave just the actual doc-gathering part.
    - Doesn't say outright that it supports OpenAPI v3 docs, but there is a note about a limitation regarding OpenAPI v3 docs, something about inheritance and discriminators.  I guess that's a good enough indication.
- [koa-mapper](https://www.npmjs.com/package/koa-mapper) is kinda what I want, but it's still its own router as well.  I just want a middleware.
- [koa-swagger-decorator](https://www.npmjs.com/package/koa-swagger-decorator) I had some hope at the start of the readme, but then it went into a bunch of mapdir babel transpile bullshittery and, at that point, I might as well just use TS directly.
    - Also, why the need for decorators?  To make it look like Spring?  It's not Java+Spring, it's JS+Koa.
    - API looks kiiiinda similar to a spec-builder API I was imagining, but split across separate free functions used as `@decorators`.  Meh.
- [openapi-backend](https://www.npmjs.com/package/openapi-backend) Builds a backend based on an OpenAPI Doc + Handlers.  If I were going at it from that direction, this might be great.  As it is, it's kinda eh.
- [koa-smart](https://www.npmjs.com/package/koa-smart) is actually somewhat closer to what I'm looking for, though it's still doing too much in my opinion.

#### Swagger UI

- [koa2-swagger-ui](https://www.npmjs.com/package/koa2-swagger-ui) which doesn't seem to have anything about getting the OpenAPI doc itself.  Maybe it just parametrizes the UI and the UI app (which is a SPA) just `GET`s it?
    - I guess then one could just point it at `/path/to/our/openapi.json`.  Guess that's all.
- [swagger-ui](https://www.npmjs.com/package/swagger-ui) if I just want the official thing and will roll my own glue.
    - Though, I'm not sure there's much to glue other than serving static content?  Hm.



## Tooling Thoughts

Basically, everything is made prefabbed with far more opinions than I want.  I have my own opinions, damnit!  About the only useful things are things which show the Swagger UI for a given OpenAPI doc, and there I can just use the official package.  Everything else, I might as well just build my own stuff, make yet another package of opinionated bullshittery.  Why not?


### Implementation Details: Koa-Router

As part of this, I'll need to take a peek at Koa Router, specifically how it stores things.

More or less, the thing I'm interested in is this:

```
class Router {
    // ...
    protected stack: Array<Layer>;
}
```

As for Layer?  Well, it's marked `@private` in the docblock, so we're not meant to depend on it.  Of course not.  Why make things inspectable?

> Not sure if this is useful to know yet, but Path-to-Matcher conversion is handled in `Layer` by [path-to-regexp](https://github.com/pillarjs/path-to-regexp#readme).  Note the `p` at the end of `regexp`, that's very important!  It may be worth looking at what it does and using that to make the OpenAPI-style paths.
>
> Take a quick glance, it does expose its `parse` function, which accepts a path string and returns an array of strings or token-reprs, so that's possibly useful.

Layer itself has some things of interest for iteration and OpenAPI Endpoint Spec generation:

```
class Layer {
    protected opts: {
        // ... other Layer-specific options?

        // this gets passed straight to pathToRegexp(),
        // so has at least this interface:

        // When true the regexp will be case sensitive. (default: false)
        sensitive?: boolean;

        // When true the regexp allows an optional trailing delimiter to match. (default: false)
        strict?: boolean;

        // When true the regexp will match to the end of the string. (default: true)
        end?: boolean;

        // When true the regexp will match from the beginning of the string. (default: true)
        start?: boolean;

        // The default delimiter for segments. (default: '/')
        delimiter?: string;

        // Optional character, or list of characters, to treat as "end" characters.
        endsWith?: string;

        // List of characters to consider delimiters when parsing. (default: undefined, any character)
        whitelist?: string;
    };

    protected methods: Array<HttpMethod>;

    // This gets populated by pathToRegexp().
    protected paramNames: Array<PathParam>;

    protected path: string;

    protected stack: Array<Middleware>;
}
```

`Layer#path` is parsed using `path-to-regexp/pathToRegExp()`, yielding `Layer#regexp`, but we're not interested in that.

This gives us some useful starting information:

- We have the path itself, of course.
- We have the Params.

#### Getting the Router In the First Place

This is simple, and quite fortunate: `Router#routes()` returns `Middleware & { router: Router }`, so we can traverse the Koa middleware stack and look for anything with the `.router` prop that's an instance of `Router`.

#### Nested Routers

I noted above that we have `Layer#stack` which is `Array<Middleware>`.  Much like traversing Koa's stack itself, we'll need to recur on this to grab any subrouters' docs.


### Implementation Details: path-to-regexp

We can use `path-to-regexp/parse()` and `Layer#opts` to get a token list from a path string.  This together with `Layer#params` gives us enough information to create the OpenAPI-style Path and verify if all Path Parameters have been adequately documented.  Or something like that, anyway.

```
/**
 * Literal elements in the Token List are represented as strings,
 * while other elements are represented a Token object.
 */
type TokenList = Array<string | Token>;

interface Token {
    /**
     * The name of the token (string for named or number for index)
     */
    name: string | number;

    /**
     * The prefix character for the segment (e.g. /)
     */
    prefix: string;

    /**
     * The delimiter for the segment (same as prefix or default delimiter)
     */
    delimiter: string;

    /**
     * Indicates the token is optional (boolean)
     */
    optional: boolean;

    /**
     * Indicates the token is repeated (boolean)
     */
    repeat: boolean;

    /**
     * The RegExp used to match this token (string)
     */
    pattern: string;
}
```


### Implementation Details: Koa

Not much to say.  When you use `Application#use()` it pushes the function onto `Application#middleware: Array<Middleware>`.  Walk that array to look for things matching the interface `{ router: Router }`.  Boom.



## Test Iteration

Building up a [test router](./Journal%202019-07-21%20-%20On%20Swaggerdocifying%20Koa%20and%20Koa%20Router%20%28Files%29/router.js) and creating a [middleware/router walker](./Journal%202019-07-21%20-%20On%20Swaggerdocifying%20Koa%20and%20Koa%20Router%20%28Files%29/iterate-routes.js) I see the following:

```
Router: prefix=/v1
  Layer: path="/v1/" methods=[HEAD,GET] paramNames=[] opts={"end":true,"name":null,"sensitive":false,"strict":false,"prefix":"/v1"}
  Layer: path="/v1/users" methods=[HEAD,GET] paramNames=[] opts={"end":true,"name":null,"sensitive":false,"strict":false,"prefix":"/v1"}
  Layer: path="/v1/users" methods=[POST] paramNames=[] opts={"end":true,"name":null,"sensitive":false,"strict":false,"prefix":"/v1"}
  Layer: path="/v1/users/:userId" methods=[HEAD,GET] paramNames=[{"name":"userId","prefix":"/","delimiter":"/","optional":false,"repeat":false,"partial":false,"asterisk":false,"pattern":"[^\\/]+?"}] opts={"end":true,"name":null,"sensitive":false,"strict":false,"prefix":"/v1"}
  Layer: path="/v1/things/" methods=[HEAD,GET] paramNames=[] opts={"end":true,"name":null,"sensitive":false,"strict":false,"prefix":""}
  Layer: path="/v1/things/:thingId" methods=[HEAD,GET] paramNames=[{"name":"thingId","prefix":"/","delimiter":"/","optional":false,"repeat":false,"partial":false,"asterisk":false,"pattern":"[^\\/]+?"}] opts={"end":true,"name":null,"sensitive":false,"strict":false,"prefix":""}
  Layer: path="/v1/things/" methods=[POST] paramNames=[] opts={"end":true,"name":null,"sensitive":false,"strict":false,"prefix":""}
  Layer: path="/v1/things" methods=[] paramNames=[] opts={"end":false,"sensitive":false,"strict":false,"prefix":"/v1","ignoreCaptures":false}
```

Which is interesting, since I defined the Things routes using a sub-router.

> Aside: I need to correct my previous usage: The correct way to use a subrouter, demonstrated above, is `parent.use('/childprefix', child.routes(), child.allowedMethods())`.  For some reason, I never saw that when first using it.  Not sure why.  Setting the routes in the app is still done with two separate calls to `app.use()`, as in `app.use(parent.routes());` then `app.use(parent.allowedMethods());`.

> Aside 2: Paths in Express were and thus in `pathToRegexp` are `strict:false` by default, so trailing slashes don't do anything.  Apache and Flask are frowning at Express and Koa.  Frowning mightily indeed.  Well, probably not, really, but eh.)

I'm guessing that Koa Router as an optimization measure merges the routes of any sub-routers into itself.  Indeed, [this is what it does](https://github.com/koajs/koa-router/blob/93c77ab9482f38d470e818a8c5a3be9c7ab08614/lib/router.js#L263).  This is extremely convenient: it means I don't need to do such flattening myself.

Let's pretty up the output a bit better.

```
Router: prefix=/v1
  Layer:
    path="/v1/"
    methods=[HEAD,GET]
    paramNames=
    opts={"end":true,"name":null,"sensitive":false,"strict":false,"prefix":"/v1"}
    middleware=
      (fn)
  Layer:
    path="/v1/users"
    methods=[HEAD,GET]
    paramNames=
    opts={"end":true,"name":null,"sensitive":false,"strict":false,"prefix":"/v1"}
    middleware=
      (fn)
  Layer:
    path="/v1/users"
    methods=[POST]
    paramNames=
    opts={"end":true,"name":null,"sensitive":false,"strict":false,"prefix":"/v1"}
    middleware=
      (fn)
      (fn)
  Layer:
    path="/v1/users/:userId"
    methods=[HEAD,GET]
    paramNames=
      {"name":"userId","prefix":"/","delimiter":"/","optional":false,"repeat":false,"partial":false,"asterisk":false,"pattern":"[^\\/]+?"}
    opts={"end":true,"name":null,"sensitive":false,"strict":false,"prefix":"/v1"}
    middleware=
      (fn)
  Layer:
    path="/v1/things/"
    methods=[HEAD,GET]
    paramNames=
    opts={"end":true,"name":null,"sensitive":false,"strict":false,"prefix":""}
    middleware=
      (fn)
  Layer:
    path="/v1/things/:thingId"
    methods=[HEAD,GET]
    paramNames=
      {"name":"thingId","prefix":"/","delimiter":"/","optional":false,"repeat":false,"partial":false,"asterisk":false,"pattern":"[^\\/]+?"}
    opts={"end":true,"name":null,"sensitive":false,"strict":false,"prefix":""}
    middleware=
      (fn)
  Layer:
    path="/v1/things/"
    methods=[POST]
    paramNames=
    opts={"end":true,"name":null,"sensitive":false,"strict":false,"prefix":""}
    middleware=
      (fn)
      (fn)
  Layer:
    path="/v1/things"
    methods=[]
    paramNames=
    opts={"end":false,"sensitive":false,"strict":false,"prefix":"/v1","ignoreCaptures":false}
    middleware=
      (fn)
```

Bit longer, but much easier to read.

That in mind, we can create an `eachRoute` function.  Given that `Layer` already has everything I need, I'll just walk each of those as is.

```
HEAD,GET /v1/
  params:
  apiDocs: null
HEAD,GET /v1/users
  params:
  apiDocs: null
POST /v1/users
  params:
  apiDocs: null
HEAD,GET /v1/users/:userId
  params:
    userId: {"name":"userId","prefix":"/","delimiter":"/","optional":false,"repeat":false,"partial":false,"asterisk":false,"pattern":"[^\\/]+?"}
  apiDocs: null
HEAD,GET /v1/things/
  params:
  apiDocs: null
HEAD,GET /v1/things/:thingId
  params:
    thingId: {"name":"thingId","prefix":"/","delimiter":"/","optional":false,"repeat":false,"partial":false,"asterisk":false,"pattern":"[^\\/]+?"}
  apiDocs: null
POST /v1/things/
  params:
  apiDocs: null
```

Alright, that's getting closer to schematic.  Let's try adding an `apiDoc` to something.

```
HEAD,GET /v1/
  params:
  apiDoc: null
HEAD,GET /v1/users
  params:
  apiDoc:
    {
      "summary": "Gets a list of users you're allowed to see.",
      "parameters": [],
      "responses": {
        "200": {
          "description": "A list of Users",
          "content": {
            "application/json": {
              "schema": {
                "type": "array",
                "items": {
                  "type": "object",
                  "required": [
                    "id",
                    "name"
                  ],
                  "properties": {
                    "id": {
                      "type": "integer",
                      "format": "int64"
                    },
                    "name": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
POST /v1/users
  params:
  apiDoc: null
HEAD,GET /v1/users/:userId
  params:
    userId: {"name":"userId","prefix":"/","delimiter":"/","optional":false,"repeat":false,"partial":false,"asterisk":false,"pattern":"[^\\/]+?"}
  apiDoc: null
HEAD,GET /v1/things/
  params:
  apiDoc: null
HEAD,GET /v1/things/:thingId
  params:
    thingId: {"name":"thingId","prefix":"/","delimiter":"/","optional":false,"repeat":false,"partial":false,"asterisk":false,"pattern":"[^\\/]+?"}
  apiDoc:
    {
      "summary": "Get a Thing by ID.",
      "parameters": [
        {
          "name": "thingId",
          "in": "path",
          "required": true,
          "description": "ID of the Thing you want.",
          "schema": {
            "type": "integer",
            "format": "int64",
            "minimum": 1
          }
        }
      ],
      "responses": {
        "200": {
          "description": "A Thing",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "id",
                  "name"
                ],
                "properties": {
                  "id": {
                    "type": "integer",
                    "format": "int64"
                  },
                  "name": {
                    "type": "string"
                  }
                }
              }
            }
          }
        }
      }
    }
POST /v1/things/
  params:
  apiDoc: null
```

Of course, that's not _quite_ where I want it.  I want an OpenAPI Path, not a Koa/Express Path.  Fortunately, as noted some ways up, I have all the necessary information and tooling:

- The original Path, fully flattened.
- The function `path-to-regexp/parse()` to get a token list.
- The Layer options, which are passed to `parse()`.

Plunking in one of the above paths gives us back something like this:

```json
[
    "/v1/things",
    {"name":"thingId","prefix":"/","delimiter":"/","optional":false,"repeat":false,"partial":false,"asterisk":false,"pattern":"[^\\/]+?"}
]
```

Any contiguous constant parts are returned as single strings, while variables are returned as this Token object here.

For the most part, it looks like we can create the OpenAPI style path like so:

```js
const openApiPath = tokens.reduce(
    (acc, part, partIndex) => {
        if (typeof part === 'string') {
            return acc + part;
        }

        if (typeof part === 'object' && part) {
            // OpenAPI only puts the name in the path, nothing like repetition modifiers, etc.
            return acc + `${part.prefix}{${part.name}}`;
        }

        throw new Error(`Unrecognized path part at index ${partIndex}`);
    },
    ''
);
```

A bit of massaging after that and it's good.  Probably.

```
HEAD,GET /v1
  koaPath: /v1/
  params:
  apiDoc: null
HEAD,GET /v1/users
  koaPath: /v1/users
  params:
  apiDoc:
    {
      "summary": "Gets a list of users you're allowed to see.",
      "parameters": [],
      "responses": {
        "200": {...}
      }
    }
POST /v1/users
  koaPath: /v1/users
  params:
  apiDoc: null
HEAD,GET /v1/users/{userId}
  koaPath: /v1/users/:userId
  params:
    userId: {"name":"userId","prefix":"/","delimiter":"/","optional":false,"repeat":false,"partial":false,"asterisk":false,"pattern":"[^\\/]+?"}
  apiDoc: null
HEAD,GET /v1/things
  koaPath: /v1/things/
  params:
  apiDoc: null
HEAD,GET /v1/things/{thingId}
  koaPath: /v1/things/:thingId
  params:
    thingId: {"name":"thingId","prefix":"/","delimiter":"/","optional":false,"repeat":false,"partial":false,"asterisk":false,"pattern":"[^\\/]+?"}
  apiDoc:
    {
      "summary": "Get a Thing by ID.",
      "parameters": [...],
      "responses": {
        "200": {...}
      }
    }
POST /v1/things
  koaPath: /v1/things/
  params:
  apiDoc: null
```


### On operationId

In my current setup, all my Controller Methods are implemented as functions with names, so probably it'll just use `Function#name` for `operationId` and warn if it's not present.

In fact, I should test this with my quick-n-dirty test thingy.

```
HEAD,GET /v1
  koaPath: /v1/
  controllerMethod.name: null
  params:
  apiDoc: null
HEAD,GET /v1/users
  koaPath: /v1/users
  controllerMethod.name: getUsers
  params:
  apiDoc:
    {
      "summary": "Gets a list of users you're allowed to see.",
      "parameters": [],
      "responses": {...}
    }
POST /v1/users
  koaPath: /v1/users
  controllerMethod.name: null
  params:
  apiDoc: null
HEAD,GET /v1/users/{userId}
  koaPath: /v1/users/:userId
  controllerMethod.name: null
  params:
    userId: {"name":"userId","prefix":"/","delimiter":"/","optional":false,"repeat":false,"partial":false,"asterisk":false,"pattern":"[^\\/]+?"}
  apiDoc: null
HEAD,GET /v1/things
  koaPath: /v1/things/
  controllerMethod.name: null
  params:
  apiDoc: null
HEAD,GET /v1/things/{thingId}
  koaPath: /v1/things/:thingId
  controllerMethod.name: getThingById
  params:
    thingId: {"name":"thingId","prefix":"/","delimiter":"/","optional":false,"repeat":false,"partial":false,"asterisk":false,"pattern":"[^\\/]+?"}
  apiDoc:
    {
      "summary": "Get a Thing by ID.",
      "parameters": [...],
      "responses": {
        "200": {...}
      }
    }
POST /v1/things
  koaPath: /v1/things/
  controllerMethod.name: null
  params:
  apiDoc: null
```

Decided to do this based on which middleware caried the `apiDoc` object, since it's pretty likely that's where it'd be.



## On the Actual Shape of Usage

Honestly, I should try to make this closer to my target use case, but the target use case tries to keep Controllers out of the business of doing anything with ctx.  Which naturally lead to Controllers all having to return a Response Description Object of some sort, but anyway.

If it sounds like that leads to a lot of boring param and body extraction, you're right!


### Knex Style API Doc Builder?

Is there any value to making a builder with shorthand methods?  Certainly when writing things a lot, it actually does read better to write `axios.get('/blah')` than it does writing `axios({ method: 'get', url: '/blah' })`.  If we have to specify `method` and `url` everywhere, there's a lot of value in coming up with a more specific DSL that directly encodes those: Even though you could get to reading the object-form just as well as the fluent-form, the vast majority of the time object-form is useless noise.

So, the question is, can that same logic be applied to building endpoint specs?

The problem is, Axios is dealing with a very small language space: HTTP Methods.  We're dealing with something a bit more like Knex.  Sorta.

Suppose we have this:

```json
{
  "paths": {
    "/things/{thingId}": {
      "summary": "Get a Thing by ID.",
      "parameters": [
        {
          "name": "thingId",
          "in": "path",
          "required": true,
          "description": "ID of the Thing you want.",
          "schema": {
            "type": "integer",
            "format": "int64",
            "minimum": 1
          }
        }
      ],
      "responses": {
        "200": {
          "description": "A Thing",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "id",
                  "name"
                ],
                "properties": {
                  "id": {
                    "type": "integer",
                    "format": "int64"
                  },
                  "name": {
                    "type": "string"
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

So, aside from the fact that all the closing braces are super obnoxious, can we do anything about the rest of it?

- For Parameters, things like `format: "int64"` imply `type: "integer"`.
- For us, `operationId` will be either just the `method.name` property, or a combination of that and some controller name.  Certainly, we'll need to check at the top level that all `operationId`s are unique.
- Schemas that reference some well known object type can be converted to a reference of the appropriate kind.  Probably `#/components/schemas/Foo`.

Now, in our use case, we might have something that looks like this:

```js
const { openApiEndpoint, parameters, schemas } = require('@joedski/openapi-utils');
const thingsController = require('./controllers/thingsController');

let router; //...

router.get('/things/:thingId', openApiEndpoint(
    thingsController.getThingById,
    "Get a Thing by ID.",
    parameters()
        .path('thingId', "ID of the Thing you want.", schemas.int64({ minimum: 1 })),
    responses()
        .response(200, "A Thing", contentTypes()
            .json(schemas.object(it => {
                it.required.property('id', schemas.int64());
            })))
));
```

```js
const paramDefs = parameters(param => {
    param.required.path(
        'thingId',
        "ID of the Thing you want.",
        schemas.int64({ minimum: 1 })
    );
});

const responseDefs = responses(response => {
    response(200, "A Thing.", contentTypes(type => {
        type('application/json', schemas.ref('#/components/schemas/Thing'));
    }));
});
```

```js
router.get('/things/:thingId', openApiEndpoint(
    thingsController.getThingById,
    "Get a Thing by ID.",
    endpoint => {
        endpoint.parameters(p => {
            p.required.path('thingId', schemas.int64({ minimum: 1 }));
        });
        endpoint.responses(rs => {
            rs.response(200, "A Thing", contentType => {
                contentType.json(schemas.ref('#/components/schemas/Thing'));
            });
            rs.response(400, "Bad Request");
        });
    }
));
```

How's things like that compare to:

```js
router.get('/things/:thingId', openApiEndpoint(thingsController.getThingById, {
    summary: "Get a Thing by ID.",
    parameters: [
        { in: 'path', name: 'thingId', required: true, schema: { type: 'integer', format: 'int64', minimum: 1 } }
    ],
    responses: {
        200: {
            description: "A Thing.",
            content: {
                'application/json': {
                    schema: { $ref: '#/components/schemas/Thing' },
                },
            },
        },
    },
}));
```

Hmm.  There are some nice things, but the skeleton of the doc is more clear than the function calls.

```js
router.get('/things/:thingId', openApiEndpoint(thingsController.getThingById, {
    summary: "Get a Thing by ID.",
    parameters: [
        // NOTE: No need to specify 'required' because
        // it's already required in the path.
        parameter.path('thingId', schema.int64({ minimum: 1 })),
    ],
    responses: {
        200: response.jsonContent(
            "A Thing",
            { $ref: '#/components/schemas/Thing' }
        ),
    },
}));
```

That seems to cut down on noise without getting too magical, and ultimately the functions are just convenience shortcuts for creating actual objects.  These shortcut things are actually [really easy to create](./Journal%202019-07-28%20-%20Simple%20Object%20Builder.md).
