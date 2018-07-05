Dogmatic Separation of Application Layers as Pertains Specifically to REST APIs
===============================================================================

> How to wobsite borkend with big weouiaoueurds.

> Second note: This isn't necessarily complete or even correct, mostly just a dumping ground for my thoughts of the moment concerning sustainable development on REST-APIs.

- The _External Interface (API)_ is exposed via _Routers_.
- _Routers_ are a Layer which maps _External Calls_ to _Controller Methods_, usually while handling things like input validation and normalization, permissions checks, etc.  They can also handle output validation if you want, which is recommended at least during development.
  - _Routers_ are the only Layer which should have any knowledge of the outside world.
- _Controller Methods_ deal with actual Business Logic, querying, manipulating, and passing-back data from/to _Models_ and other _Controller Methods_.  They then return a response, be it a success or an error.
  - _Controller Methods_ should not know about the outside world, rather any data they need should be passed in from the _Router_ or other _Controller Methods_.
- _Models_ should present a uniform interface regardless of the underlying technology, though in pracice this is unlikely to be the case because specific technologies beget specific solutions.
  - Still, _Models_ should act as a Business-Logic-Meaningful interface between the _Backing Data Stores_ and whatever is calling them.
  - Typically, only _Controller Methods_ or _Joining-Models_ should call any _Models_.  In practice, a great many _Models_ may call each other, especially when the data is highly relational, though hopefully this isn't necessary too often.
- Ideally, _Controller Methods_ are actually mere combinations of _Model Interactions_ and _Data Processing Methods_, and the _Data Processing Methods_ are pure functions to allow easy testing of actual input logic and any edge cases that crop up.
  - Even more ideally, it is these _Data Processing Methods_ that are what _Controller Methods_ call rather than other _Controller Methods_, which should be pretty easy to do if your first _Controller Methods_ are already such combinations.
  - This is not a quick way to write things, of course, but it is a Good way to write things.  I think the _Value Triangle_ here might be _Functioning, Fast, and Maintainable_.

I think this is basically the Onion Architecture or the Hexagonal Architecture...
