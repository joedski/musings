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

Regarding whether or not that's even allowed due to needing to hide implementation details from others, well, I don't see it that way.  In fact, to me the point of the unit test is that it tests a specific unit in isolation, such that it's immaterial to anything else if that unit exists or has tests.  The fact then that some other thing uses that unit of functionality or any other unit of functionality is thus immaterial to writing that given unit of functionality in a testable manner, i.e. it being publicly available.

Which I think also is why I have an issue with too many private methods.  Private methods are for decomposing the implementation of the publicly exposed interface, but when those get too big your public interface can become unwieldy to test.  This is made even worse when you have a multitude of private methods to handle the logic needed of the public interface but part of that is also integration of multiple other dependencies.  It means that the given unit is probably too big and has not been sufficiently decomposed.

Here's [an interesting answer presenting two different perspectives](https://softwareengineering.stackexchange.com/a/412182) that is really worth a read through, I think.

1. Their company's perspective, which is that you don't test units, but rather test _layers_: The Data Access Layer, or the Business Logic Lyer, while mocking any other layers in the application.
    - The DAL in their case is mocked by mocking the data in an in-memory or temporary data store, not stubbing individual methods, which I'd actually prefer since it's mostly the knowledge of specific method calls I dislike.
2. Their own perspective, that you can't avoid mocking (because you need integration tests since those check that n separate units work together _in a given environment_), but that you should still have unit-testable code that should be testable without mocking.

Very good stuff, I think I need to read more different perspectives like those.

One team member remarked that they did not think we should test private methods, and that's a fair concern: I currently use `private` to indicate "internal implementation detail", and such details shouldn't be known, but ... Hm.  Where am I actually coming into friction with the current methodology?

- Mocking method calls already deals with internal implementation details (you have to know not just what other units are being referenced, but what parts of those units are being referenced), so the fact that we need that much detail means we're not really avoiding dealing with internal implementation details.
- It's really hard to incrementally have confidence in edits if the actual backing business logic itself isn't being unit tested.  That is, either the unit tests are not granular enough to see where the failure occurred, or the code is itself not structured well enough to test so granularly.
- To reiterate from above, most of a Service seems to be an integration of I/O (anything outside of self) and Business Logic (the actual interesting stuff).
    - What I want to test is just the Business Logic, because the I/O supposedly is already tested, either by library authors or by the compiler/tooling checking we're using the interface correctly. (Though that also depends on making our interface/contract rigorous enough...  Wondering if we should have more inner/specific classes for input arguments just to be more descriptive.)

Maybe that just means I should have two separate sets of _public_ methods:

1. The Business Logic: this implements the actual rules described in the User Story or any specification documents.
    - Business Logic is either Pure or Mutation Only.  In either case, the only side effects permitted are logging.
2. The Integration: this ties together any I/O with Business Logic to implement some desired behavior in the app.

That could be interesting.  Sometimes what I want in another service is not to make a bunch of extra calls to something, but rather to reuse the Business Logic with its own I/O.  Though, I wonder then if a given Service should be restricted to 1 of 2 kinds:

1. Entity Service: Implements I/O and Business Logic related to one and only one Entity Class.
2. Composite Service: Implements I/O and Business Logic related to two or more Entity Classes.

This strict separation would result in a proliferation of small Services, though I think I'd prefer that over the current mess of Services.  Granted, that's just because the current Services are mish-mashes of different concerns, so any separation might be better than the current thing.

I'm also not sure how practical that separation actually is, given that usually the business logic around a certain entity involves at least one other entity class.  Hm.



## Unit Test Coverage

I think the only issue is: if I separate I/O from Business Logic, I'll have a bunch of methods whose implementation is just I/O and, since I don't always have control over the Code Coverage settings of the project, that'll result in a bunch of code that lacks any Code Coverage because I don't want to mock everything.

However.  If some of the methods are just binding of I/O to Business Logic Calls, then maybe the I/O Bindings can themselves be moved elsewhere?

And, do we really want to avoid mocking other Services?  I suppose that depends on what you mean by Unit Tests, given that Unit Testing in a more strict sense as noted above, or if you just mean testing generally.

As another question of course, just where would that I/O be moved?  ... Annotations?


### I/O Injection Via Overloads and Nested Interfaces or Classes

If we have I/O specified as a parameter, we can inject it.  Perhaps each I/O operation is specified as a separate param?  Or maybe we have a single Operation I/O Class? (An instance-inner class to be sure)

Something like:

```java
public class FooService {
  @Accessors
  public class ChangeFooOwnershipIo {
    protected Function<String, User> getUserById;
    protected Function<String, Foo> getFooById;
    protected Consumer<Foo> saveFoo;
  }

  public changeFooOwnership(
    String fooId,
    String nextFooOwnerId,
    ChangeFooOwnershipIo io
  ) {
    Foo foo = io.getFooById(fooId);
    User prevFooOwner = io.getUserById(foo.ownerId);
    User nextFooOwner = io.getUserById(nextFooOwnerId);
    // ... stuff.
    io.saveFoo(foo);
    return foo;
  }
}
```

Something like that.  How to specify the normal implementation though?  Static method like `ChangeFooOwnershipIo.getImplementation()`?  Have a controller specify it?  Overloads?

Overloads would be simple enough, if mildly redundant.  Hm.

```java
public class FooService {
  @Accessors
  public class ChangeFooOwnershipIo {
    protected Function<String, User> getUserById;
    protected Function<String, Foo> getFooById;
    protected Consumer<Foo> saveFoo;
  }

  public changeFooOwnership(
    String fooId,
    String nextFooOwnerId
  ) {
    return changeFooOwnership(
      fooId,
      nextFooOwnerId,
      new ChangeFooOwnershipIo() {
        protected getUserById = userId -> userRepository.findById(userId);
        protected getFooById = fooId -> fooRepository.findById(fooId);
        protected saveFoo = foo -> fooRepository.save(foo);
      }
    )
  }

  public changeFooOwnership(
    String fooId,
    String nextFooOwnerId,
    ChangeFooOwnershipIo io
  ) {
    Foo foo = io.getFooById(fooId);
    User prevFooOwner = io.getUserById(foo.ownerId);
    User nextFooOwner = io.getUserById(nextFooOwnerId);
    // ... stuff.
    io.saveFoo(foo);
    return foo;
  }
}
```

Though in that case, maybe just use methods.  Hm.  I'm also not entirely sure if that's valid sytax but anyway.

EDIT: Actually, that's definitely wrong, they should read `getGetFooById()(foo.ownerId)`, etc.  Methods would definitely be the way to go, so Interface or Abstract Class.

```java
public class FooService {
  // Apparently while Inner Classes are a thing, Interfaces can
  // only ever be Nested (Public Static), and never Inner.
  // I suppose I could use an abstract inner class if I really needed
  // access to the current class's type parameters, but our services
  // don't use generics like that.
  interface ChangeFooOwnershipIo {
    User getUserById(String userId);
    Foo getFooById(String fooId);
    void saveFoo(Foo);
  }

  public changeFooOwnership(
    String fooId,
    String nextFooOwnerId
  ) {
    return changeFooOwnership(
      fooId,
      nextFooOwnerId,
      new ChangeFooOwnershipIo() {
        getUserById(userId) {
          return userRepository.findById(userId);
        }
        getFooById(fooId) {
          return fooRepository.findById(fooId);
        }
        saveFoo(foo) {
          fooRepository.save(foo);
        }
      }
    )
  }

  public changeFooOwnership(
    String fooId,
    String nextFooOwnerId,
    ChangeFooOwnershipIo io
  ) {
    Foo foo = io.getFooById(fooId);
    User prevFooOwner = io.getUserById(foo.ownerId);
    User nextFooOwner = io.getUserById(nextFooOwnerId);
    // ... stuff.
    io.saveFoo(foo);
    return foo;
  }
}
```

And besides making the interface to `#changeFooOwnership` smaller, I'm not sure what that actually nets us that just putting everything into function parameters doesn't.

```java
public class FooService {
  public changeFooOwnership(
    String fooId,
    String nextFooOwnerId
  ) {
    return changeFooOwnership(
      fooId,
      nextFooOwnerId,
      userId -> userRepository.findById(userId),
      fooId -> fooRepository.findById(fooId),
      foo -> fooRepository.save(foo)
    );

    // Alternatively this, assuming the types are unambiguous enough.

    return changeFooOwnership(
      fooId,
      nextFooOwnerId,
      userRepository::findById,
      fooRepository::findById,
      fooRepository::save
    );
  }

  public changeFooOwnership(
    String fooId,
    String nextFooOwnerId,
    Function<String, User> getUserById,
    Function<String, Foo> getFooById,
    Consumer<Foo> saveFoo
  ) {
    Foo foo = io.getFooById(fooId);
    User prevFooOwner = io.getUserById(foo.ownerId);
    User nextFooOwner = io.getUserById(nextFooOwnerId);
    // ... stuff.
    io.saveFoo(foo);
    return foo;
  }
}
```

Okay, actually, the nested interface form does net us something: it tells us what each function is.  I actually kinda don't like the function parameter form because it doesn't!  Technically, I suppose there's also the consideration that with the lambdas it's three anonymous classes instead of 1 nested interface and 1 anonymous class because lambdas; and due to that, 3 instantiations vs 1.  True, this (probably) isn't a tight loop but still.

In either case, that's still more instantiations than dependency injection, though it allows for "mock-less" mocking.



## How Is Code Intended To Be Unit Tested in Spring Boot Applications Anyway?

Searching for how to write unit testable spring boot code...

1. [Quora question on the topic](https://www.quora.com/How-does-the-Spring-Framework-help-when-writing-a-testable-code)
    1. One answer seems to indicate that you create mock instances of all the injected services and define the behaviors of each method on those mocks.
        1. I'm not sure how that's different from what we currently do, other than maybe moving the main mocking ... mmmprocess to a general setup part?  Otherwise I don't understand what this actually gains us.
2. [Some random article on writing unit testable code](https://www.codepedia.org/toptal/unit-tests-how-to-write-testable-code-and-why-it-matters/) which basically lays out in more detail what item 1 said: Use DI to provide mocks that fit the interface.
    1. [Original source](https://www.toptal.com/qa/how-to-write-testable-code-and-why-it-matters)
    2. Many of our services require injection of so many other services I'm not sure that's useful to know, though.  That may indicate that such services are actually too broad, and require too much knowledge of the rest of the application, or that there are at least too many such services.

So from those two at least, I get the feeling that what I'm seeing in our codebases is:

1. Many services have too many dependencies.
2. Many services (and repositories?) have too much going on to effectively mock at a higher level.  Too many methods, not tightly focused enough, basically.

These factors cross to make mocking a difficult and unpleasant experience, and make the tests quite inscrutible.  Perhaps the issue then is not with mocking itself in this case, since it's basically inevitable when dealing with dependency injection, but with the way our services are being built.  Which wouldn't surprise me.

> Of course, mocking the entire data layer (or rather the entities within it) and just testing the entire services layer would also work, but that doesn't seem to be standard practice where I am.  Maybe that should be a suggestion.  I'd volunteer to spearhead it if I actually had more experience with it.

Many of the services are quite large, somewhat so in the public method part and very much so in the private member side.  Particularly in one project, which dealt with a hierarchy with different entities at each level, none of that was abstracted around despite most of the methods sharing quite a lot code.  It would've been trivial to create a few generic methods and just parametrize behaviors using lambdas or even just anonymous instances.
