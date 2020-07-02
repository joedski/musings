Journal 2020-07-02 - What If The Router Supported HTTP Methods?
========

Currently, Vue Router (And basically every other router I've seen) only supports `GET`, effectively.  What if you actually could declare a payload as part of a route's interface, though?

Essentially, this would support `POST` or `PUT` to bring things closer in terminology to a normal non-SPA web-app.  Could this be useful?  I think in the interest of isormorphism, it could be.  I'm not sure how necessary it is to SPAs, really, but they do live in the browser and browsers are primarily HTTP clients to HTTP servers, and HTTP supports those various other methods with bodies.

I'm thinking about this primarily because it would make certain form-based flows easier to do purely from the router while still supporting browser history, at least if you don't muck it up like a naughty dev.



## A Possible Use Case

The use case that brought this thought on was a multi-step form, and how that reminded me of [one suggested implementation style when talking about actually-RESTful applications](https://levelup.gitconnected.com/to-create-an-evolvable-api-stop-thinking-about-urls-2ad8b4cc208e).  (SPOILERS: That talks about HATEOAS (without calling it that), which is a key aspect to actually-RESTful applications)

Basically, you'd use the route to manage the over-all current state of the form interaction, with the component's own state managing only the transient state (current input values, did the user touch this, etc) necessary to support an interactive UI.

Which sorta makes the app an in-browser HTTP server.  Sorta kinda.

The thought is very enticing, as it goes back to making the browser history fully useful again.  I wonder if it works in practice, and how easy it would be to hack Vue Router to support that just as a proof of concept?
