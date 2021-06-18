Journal 2021-05-05 - How Is JPA Intended to be Used with Complex Data Models?
========

The short answer, so far as Tiny Joe Brain understands it right now, is Aggregate Roots.  Specifically, Aggregate Roots in the context of Domain Driven Design.  That is very important to keep in mind.

See [this answer for a nice (relatively) short explanation](https://stackoverflow.com/a/31319207).  I like that answer both because of the size, but also because it starts from the lowest layer and goes up.

See also [martinFowler's definition of the DomainDD Aggregate, which also mentions Aggregate Root](https://martinfowler.com/bliki/DDD_Aggregate.html).

For a longer explanation that includes how this all fits together with Command/Query Separation (CQS), see [Khalil Stemmler's article on the topic](https://khalilstemmler.com/articles/typescript-domain-driven-design/aggregate-design-persistence/).  Don't let the TypeScript scare you as the article steps through how it's implemented, and more importantly _why and to what end each choice is made_.

> Note that for this one, it may help you to start with the Takeaways at the bottom of it, then to reread the article with those takeaways in mind as they will provide goalposts for you to follow along the way.

The basic principle is: Business Objects are _not_ (necessarily) Persistence Entities.  While there may be cases where Business Objects are _coincidentally_ the same as some Persistence Entities, they should never be assumed to be the same.

The way to deal with a given Business Object, one which possibly has many different Persistence Entities with various constraints, is via Aggregates.  The way we deal with referencing Aggregates is via Aggregate Roots.

- An Aggregate in the above context is a clump of objects that are related in some business-meaningful manner.
- An Aggregate Root is the object that is used to reference the Aggregate.  An Aggregate should have 1 and only 1 Aggregate Root.

An Aggregate does the following:

- It encodes the complete notion of some specific Business Object.
    - For instance, an Aggregate representing a Forum Post.
        - Such an Aggregate would have as its Root a Forum Post Record, and we would thus reference this Aggregate by the Forum Post Record's Identifier.
- It encodes related data.
    - For instance, a User that is the Author of the given Forum Post; or Replies that are other Forum Posts.
- It ensures that all of the data within it is consistent with prescribed business constraints.
    - This goes beyond basic data integrity (which is still important!  Every layer is important!) to include specific business constraints that may not be encodable within a database. (or at least, not encodable in a sane and maintainable manner...)
    - This may encode things such as "A Forum Post _must_ have 1 and only 1 User as its Author, never 0 and never more than 1."
- It encodes construction and update behaviors.
    - Note that it does _not_ encode actual persist and retrieve behaviors, rather it encodes only how to create a new one and how to update existing ones.
- Its design takes into account retrieval and persistence performance.
    - While the Aggregate itself does not encode any persistence or retrieval logic, that should be taken into account when designing the Aggregate so you don't paint yourself into an unperformant corner.

To (mostly) quote [Khalil Stemmler's article](https://khalilstemmler.com/articles/typescript-domain-driven-design/aggregate-design-persistence/):

> Our aggregate design goals are to:
> 
> - Provide enough info to enforce model invariants within a boundary
> - Provide enough info to execute use cases
> - Ensure decent database performance
> - Provide enough info to transform a Domain Entity to a DTO

How does one get an Aggregate, then?  Using an _Aggregate Repository_.

- It encodes the retrieval/query and persisting behaviors, in much the same way an Entity Repository encodes such behaviors on a given specific Entity.
    - That is, not only does it come with how to load it from minimal identifiers, but it also tells others how it can be updated.
        - Note that this does not mean it encodes Business Rules in its logic, rather that it exposes Aggregate-specific Commands that enable all of the use cases we need to implement our desired Business Rules.
