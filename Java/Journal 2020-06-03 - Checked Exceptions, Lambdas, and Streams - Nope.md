Journal 2020-06-03 - Checked Exceptions, Lambdas, and Streams - Nope
========

Basically [because of this](https://stackoverflow.com/a/27668305) you can't really use checked exceptions in any stream stuff.

- A nice blog post on the matter: https://blog.codefx.org/java/repackaging-exceptions-streams/
    - Unfortunately, I don't see any of the other posts that are mentioned in the beginning.  Dangit, they looked good.

Part of the issue likely stems from the fact that streams define a pipeline of operations, somewhat like composing transducers, rather than eagerly operating on data and producing results.  The whole point of course is to allow implementation to efficiently iterate (or not iterate) over each element along the way without having to create a bunch of intermediary collections, which is a waste of memory.  Another part is abstracting over parallel processing of collections.

What should happen with exceptions there?  And what do stream operators actually have to declare?

A naive implementation might just allow a list-of-types type parameter so you can build up a list of Exception types (this is about checked exceptions, after all) and just build up the list from there until you get to the final collect operation.  This is of course noted in the SO answer linked above.
