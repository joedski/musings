Iframes, MessageEvents, and MessageEventSource
==============================================

Okay, not much to say here, just create a simple test with an [outer page](./Journal%202019-01-04%20-%20Iframes%2C%20MessageEvents%2C%20and%20MessageEventSource/index.html) that has an iframe containing an [inner page](./Journal%202019-01-04%20-%20Iframes%2C%20MessageEvents%2C%20and%20MessageEventSource/inner.html).  When the inner page posts a message to the outer page, the outer page checks if `event.source` is the Iframe's `contentWindow`, which should be the case.  Handy!
