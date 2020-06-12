Journal 2020-06-12 - Unit Tests, Mocks, and Discomfort Therewith
===========

> While this was started when I was working on a Spring Boot project, this is really about just unit tests in general.

I think the thing that bothers me about mocking things here is that it requires inside knowledge about the implementation of the thing I'm trying to test.  Though, given that I think the Services as currently written are not very well broken up by actual business logic unit, the requirement to know what each method uses could just be a symptom of overloading each service with too many different units of business logic.  The result of that is an explosion of dependencies each one needs to inject, and thus making setup of the unit tests either require mocking _ALL THE THINGS_ or having inside knowledge about what dependencies each method actually uses.

Meaning the thing I'm complaining about is itself a symptom of the project not following SRP with regards to its Services.

Thinking about it a bit more, it's probably more that I not only have to know what module dependencies are used, but also what methods are being called, and with what, and what they're going to return.  I think this arises from being able to test only public methods and shunting all actual processing of data to private methods.  What these JUnit tests seem to end up being is not so much a unit test, but an integration test.

That could probably be fixed by breaking the real logic out into a separate module and having the actual Service tie that logic together with I/O and inter-module linkage.

Which seems to be [an opinion I'm not alone in](https://medium.com/javascript-scene/mocking-is-a-code-smell-944a70c90a6a):

> When you use generic composition utilities, each element of the composition can be unit tested in isolation without mocking the others.
>
> The compositions themselves will be declarative, so they’ll contain zero unit-testable logic (presumably the composition utility is a third party library with its own unit tests).
>
> Under those circumstances, there’s nothing meaningful to unit test. You need integration tests, instead.

And another part:

> Mocking is required when the units used to break the large problem down into smaller parts depend on each other. Put another way, mocking is required when our supposed atomic units of composition are not really atomic, and our decomposition strategy has failed to decompose the larger problem into smaller, independent problems.

So I guess that's why it felt like integration testing more than unit testing, because... it is.

Of course, there's a caveat that's mentioned right in that post, which is that that author is drawing the line between loose and tight coupling differently, and is defining "unit test" by the original definition of "test of any given unit (function, class, module) of functionality _in isolation from the rest of the codebase_."  Anything else is integration tests, which of course a number of people immediately disagreed with.  I think I'm in the camp of agreeing with that author, though.
