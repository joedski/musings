Journal 2020-04-28 - Spring JPA Repository Methods - Can I Select Only One Column?
========

1. [Spring Data JPA Repo Docs, Query Methods][spring-docs-jpa-methods]
2. [SO Question on this very topic][so-jpa-select-specific-columns]

[spring-docs-jpa-methods]: https://docs.spring.io/spring-data/jpa/docs/current/reference/html/#jpa.query-methods
[so-jpa-select-specific-columns]: https://stackoverflow.com/questions/22007341/spring-jpa-selecting-specific-columns

I wanted to see if there was a way to get just a single column in a Repository Method Name, something like `findIdBy...`.

Looking at [the docs][spring-docs-jpa-methods], I don't see anything that indicates something like that, all of their examples only return the whole record.

A random [Stack Overflow question doesn't inspire much hope, either][so-jpa-select-specific-columns], with answers basically being one of "select the whole entity", "create a specific DTO (but you'd be better off selecting the whole entity)", or "use a `@Query`".

So, I guess what I want can't be done without `@Query`.  Dang.

On the plus side, Spring Repos do support returning Sets, so that's something.
