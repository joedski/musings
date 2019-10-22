Journal 2019-10-22 - Keyed Requests Redux - Validating Different Responses
========

The previous rendition of Keyed Requests was for the most part adequate, but technically incomplete: validation didn't account for multiple possible response types, instead only validating 200 responses as specified.

Technically it should validate all response types, at least where they have a schema specified.  This means a lot of responses may just have no validation, but that also means in such cases one should have a response type of `unknown`!  Further more, given that, safe accessors should be used.

So, instead of `readRequestData(store, requestConfig)`, it should be something more like `readRequestData(store, { request, status, defaultData })`.
