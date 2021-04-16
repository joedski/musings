Journal 2021-04-12 - Maintainably Implementing Complex Business Logic Driven by Complex Data by Separating Data Retrieval and Derivation from the Logic Itself
========

Sort of a continuation on my general application development thoughts, this time focusing on managing the layers of logic involved in implementing complex business logic in a back end as opposed to a complex UI.  Like that though, it's one of those things that doesn't make a lot of sense in a tiny utility or one-off script, but which (maybe) pays dividends on larger and longer-lived projects.

Specifically here, I'm wondering about how or if to clean up the business logic.

The idea is simple, of course: I want the business logic to be readable while retaining the freedom to make complex supporting derivations of underlying application data so that the business logic itself is actually ergonomic to read and write and performance doesn't suck.

My current thought is this:

- Each piece of major business logic is implemented as its own unit apart from any other piece.
- Each piece has at least 2 parts:
    1. The logic itself.
    2. The data required to execute the logic.

In general, any piece of logic is going to have 2 major parts, Input and Output, the question really comes down to how to deal with those in the wider system of the application.

Perhaps then it's better to modify the above thought to show those 3 parts?

1. The logic itself.
2. The input, which may include persistence-reads and derivations.
3. The output, which may include persistence-writes.

This accomplishes a few things:

- It keeps the data retrieval apart from the logic.
- It keeps the data filtration and unimportant manipulation apart from the logic.

It should be noted that while the Input and Output are separate from the Logic itself, they are still intrinsic to the Logic implementation as a whole, and ideomatic to it.  They are unlikely to be generalizable or sharable, or at least should be started as specific and not eagerly generalized.



## When Does Data Manipulation Go Into the Input-Context vs the Logic?

One thing to note of course is that some amount of data manipulation may be material to the logic itself, while some (building a Map correlating two different data sets retrieved from persistence) may not be.  One issue is determining just what's "material" and what isn't.

Probably a good starting point is:

- What data manipulations are explicitly called out as part of the business logic description?
- What data manipulations are not so called out, and are only being performed in order to support the current implementation of the described business logic?

Put another way:

- What could be mocked out during a no-deps unit test vs what should not be?

Though you shouldn't mock anything like this anyway, aside from mocking the data itself.  The farther you are from running things like prod, the more likely you've missed something.


### Think Of It As a Projection or View Model

Another way I suppose it could be framed is:
- Suppose we have a projection of our storage abstractions specific to this business logic.
- Given that, what data manipulation is intrinsic to the business logic itself (defined in the description of the business logic), and what is a mere implementation detail of the storage projection?

What do I mean by this?

In the same way that we might create a specific projection of our data when querying the database by doing things like only selecting specific columns or computing aggregate values across groupings of rows, we might here define a specific projection of the underlying storage query methods and other data source requests such that the business logic only deals with queries that it itself cares about but which may not correspond to any specific or even any single existing storage call or remote service request.

For example:

- Our business logic may be concerned with some Document within a given Tenent.
    - Our projection however may look at the whole request that the business logic is fielding and make 2 calls to some DB: 1 call to get all Tenents involved, and 1 call to get all Documents involved for the given Tenents.
    - Of course, that could be the other way around too: the list of Tenants may be instead based on the list of Documetns.  In either case however, the Business Logic doesn't have to care, only the projection cares.
- Our business logic may be concerned with some subset of Documents, categorized by some Tags.
    - Our projection however will instead pre-fetch all Documents and relevant Tags and create a mapping of some sort that has all of the relevant Documents pre-organized for quick querying by Tag.

Note that in each case, the business logic doesn't care how those things are accomplished, only that they are available.  Instead, the Projection or "View Model" is what is concerned about the implementation details.

> To avoid eager calculation at the cost of some possible cruft being sometimes accidentally left in, a pull-based/lazy-call caching scheme can be used.
>
> In Java, this could be accomplished with things like `Map#computeIfAbsent()` or Lombok's `@Getter(lazy = true)`, so that while a whole bunch of queries and computations occur on the first call to a given method, subsquent calls have the data already loaded by the context/projection/"view"-model.



## What About Unit Testing?

Forget it.  There's too many dependencies to reliably mock things out, and [the farther you are from running things like prod, the more likely you are to miss things in your tests](https://phauer.com/2019/modern-best-practices-testing-java/).  The only thing you should ever mock here is the underlying data. (and external services...)

Unless you use the more liberal definition of "unit testing" to mean "testing this unit with full dependency graph", something usually called an "integration test" by pedants, then knock yourself out.


### Okay, But What About Unit Testing?

There's actually a place where you very likely DO want to still unit test: individual helper methods, switch-rules implementations, etc, _within_ the whole Business Logic implementation.  These are places where you're likely to deal with individual little bits of data outside of the larger context, and don't have to worry as much about fetching data.  Rather, you'll be concerned with very simple "if I throw X at it, does it do Y" type rules, etc.

By unit testing each bit, you build confidence that each bit will act as expected when you compose them together into the larger whole.
