Journal 2019-04-28 - Extracting Params Automatably - Koa
========================================================

This isn't going to be terribly specific to Koa, just that Koa will be used as the example wrapping.  In fact, implementation examples and sketches aside, this won't be terribly specific to JS, either.

This is also going to be kinda meandering since I'm just thinking things out.

Initial thoughts:

- Should be able to generate paramgrabbers from Swaggerdocs.
- As many param errors as possible should be sent back to the client to reduce the back-and-forth.
    - This means any extractions that fail should add to a list of errors.

So, obviously the base implementation should be a list of extractors somehow that can be reduced over given a context.

- `paramsReducer = ctx => result => nextParamGrabber => nextResult`



## The Param Grabbers Themselves

There's a few parts for each Grabber:

- Name: What's the key we're using to identify the param later things?
- Extraction from Source: Where's the raw value coming from?  Path param?  Query param?  Body value?
- Parsing: Mostly for turning stringified numbers into numbers.
- Validation: Is the value within bounds?  Is the value required but not present?

So, given that, maybe something like this?

```js
/* eslint-disable */
const getters = {
    vm_id: [
        fromPath('vm_id'),
        intoString,
        [isNonEmptyString],
    ],
    target: [
        fromBody('target'),
        intoInteger,
        [isFiniteNumber]
    ],
};

const { params, errors } = getParams(getters, ctx);
```

This would lend itself to creation from, say JSON Schemas embedded in Swaggerdocs.  There's a slight discrepancy of course when it comes to anything in the request path or headers, including cookies, versus things in the body...  It's not necessarily impossible, just requires building things a bit differently.  Specifying a whole body and individual body params may be a bit much, though.

Hm.
