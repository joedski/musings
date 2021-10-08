Journal 2021-09-07 - RequestBinding and Checking the Data of Many Different Requests Before Dispatching a Fallback
==================================================================================================================

Basically: Check these 3 requests, if none are AsyncData.Data then dispatch the first one.

Some immediate thoughts:

- How to express?
    - Return an array?
    - Extend the RequestConfig type to include an array of requests to try first?
    - Need to keep Requests Module simple, so don't add this behavior there.
- Would need to include the option to map the response data.
    - Maybe this should just be part of the request config?  I think I've mused on that before.
        - That would still keep mapping out of the requests module itself, which is the only hard requirement I have on that sort of thing.
