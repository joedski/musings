Lazy Swagger Client
===================

- Ideally, it should support lazy and eager Swaggerdoc interface creation.
- I'm not sure how to make it entirely lazy without promisifying the shit out of everything, or hiding things behind getter methods.
    - That is, we couldn't do `client.getFooBar({ query, ...etc })`.
    - Rather, we'd have to either do...
        - something like `client.get('/fooBar', { query, ...etc })`
        - or something like `client($ => $.getFooBar({ query, ...etc }))`
    - Out of both of those, the former seems the better, less weird.
        - It lets us hide the fetching of the swaggerdoc within the single method call.
        - It also has another nice benefit: Unknown endpoints can be set to generate a warning instead of erroring on trying to call undefined functions.  You could also still throw an error if you want, but a warning seems more useful.
            - Granted, the latter could be mitigated by using a Proxy, but that doesn't seem necessary to acheive the desired ends here.
        - We could also do `client('/fooBar', { method: 'get' })`, etc.
- Obviously, this isn't useful in a typescript setting, but we're not using Typescript, so, eh.
    - For Typescript, a statically created client would be best.  Honestly, a [statically created client](https://swagger.io/tools/swagger-codegen/) is better period.
- A good place to start is probably writing against their [Petstore example](https://petstore.swagger.io/v2/swagger.json).

```js
function createRequestorShortcutMethod(httpMethod) {
    function requestorShortcutMethod(path, body, options) {
        return context.request(path, body, options)
    }

    function requestorShortcutMethodWithoutBody(path, options) {
        return context.request(path, undefined, options)
    }

    switch (httpMethod && httpMethod.toUpperCase()) {
        case 'GET':
        case 'HEAD':
        case 'OPTIONS':
        case 'DELETE':
            return requestorShortcutMethodWithoutBody

        case undefined:
        case 'POST':
        case 'PUT':
        case 'PATCH':
            return requestorShortcutMethod
    }
}
```

`context.request` is a wrapper around whatever actually executes the request, beit `fetch` or `axios`.  Obviously, some of that may dictate the final API, but at the surface it shouldn't matter too much.  Granted, the API used above is more like Axios than Fetch.

Given that it's being requestor agnostic, executeRequest will have to be the first parameter.

```js
class LazySwaggerClient {
    constructor(executeRequest, options) {
        this.executeRequest = executeRequest
        this.options = options
    }
}
```

If the Swagger Doc endpoint is also required, which it is, should that also be among the first parameters?  It might be more important than the actual execution.  Though, maybe it doesn't really matter all that much?

```js
class LazySwaggerClient {
    constructor(swaggerDocUrl, executeRequest, options) {
        this.swaggerDocUrl = swaggerDocUrl
        this.executeRequest = executeRequest
        this.options = options

        this.swaggerDocManager = new swaggerDocManager(this.swaggerDocUrl, this.options)
    }

    request(path, body, options = {}) {
        return this.swaggerDocManager.ensureDoc()
        .then(() => this.swaggerDocManager.validateParameters(path, body, options))
        .then(() => this.executeRequest(path, body, options))
        // TODO: How to determine the response data?
        // I think we'd have to opt into extra body validation based on the content-type header.
        .then(res => this.swaggerDocManager.validateResponse(path, body, options, res))
    }
}
```

Hm.  It seems like this would be an intractable problem, except that there's only a few types we actually need to validate the bodies of, which are XML and JSON types.  Possibly others, but they could be specified.  This means, however, that the output would need to be transformed somehow, especially when using something that doesn't eagerly transform the output like `fetch`.

I suppose we could require an interface something like `{ request, response, body }` for the output, or just always return things like that?  Options then needs something like `getResponseBody` that maps content types to handlers.

```js
const client = new LazySwaggerClient(SWAGGER_DOC, executeRequest, {
    getResponseBody: [
        ['application/json', res => res.json()],
        ['*', res => res.blob()],
    ],
});
```

I have it as an array of arrays to allow arbitrary matchers and a defined order.  Though, just using a function may be better.

```js
const client = new LazySwaggerClient(SWAGGER_DOC, executeRequest, {
    getResponseBody(res, req, path, reqBody, options) {
        const contentType = res.headers.get('content-type')

        if (contentType === 'application/json') return res.json()
        // Opt out of processing the body just yet,
        // on the basis that there may be point-of-use-dependent handling.
        return undefined
    },
});
```

More verbose, sure, but the most general.  In any case, a body to be validated must be returned in a validatable form.
