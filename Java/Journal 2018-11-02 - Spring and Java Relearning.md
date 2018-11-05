Spring and Java Relearning
==========================

The framework, not the season.

Long time since I've actually done any Java, and last time I did it was hacking away at Minecraft mods.  Time to learn things again, in a framework that's not a literal pile of hacks.  (As impressive as Forge Mod Loader is, and it is truely impressive, there's a reason they kept the acronym for it...)



## On Nulls

The first lesson is: All types in Java are not `T`, but technically `Nullable<T>`.  Good god, this is why null pointer exceptions are a thing.



## On Collections

Everything was going swimmingly until the `Iterator<>` Nation attacked.

Transforming a `List`:

```java
List<SomeClass> someList = getSomeList();
List<OtherClass> otherList = someList
    .stream()
    .map(el -> changeThingToOther(el, OtherClass.class))
    .collect(Collectors.toList())
    ;
```

Transforming an `Iterable`:

```java
Iterable<SomeClass> someIterable = getSomeIterable();
List<OtherClass> otherList = new ArrayList<>();

for (SomeClass el : someIterable) {
    otherList.add(changeThingToOther(el, OtherClass.class));
}
```

And now I know why Java people write JS like that.

One answer was simply to [write a utility function to do `Iterable<E> -> Collection<E>` transformation](https://stackoverflow.com/questions/6416706/easy-way-to-convert-iterable-to-collection?noredirect=1&lq=1).  Another is to use [`java.util.stream.StreamSupport.stream(iterable.spliterator(), false)...`](https://stackoverflow.com/a/23996861).  Not sure if I want to do that or just stick with the for loop.  Alegedly the perf difference is negligible.  Certainly the line count isn't that much different.



## On Spring and JPA Repositories

The quickest option for basic queries is to just [write it out as the method name of your repo interface](https://docs.spring.io/spring-data/jpa/docs/current/reference/html/#jpa.query-methods), and the framework parses the name into its intermediate SQL, which then gets translated into the target native SQL.

Feels very JS-like, all this name-based automagic.

With optional params, things get a bit annoying, especially when more than one of the params are optional!  Apparently [there are ways around this](https://stackoverflow.com/questions/32728843/spring-data-optional-parameter-in-query-method), though I'm not sure if it's better than just having a bunch of if-then branches.  Hum.

That is:

```java
interface FooRepo extends CrudRepository<Foo, String> {
    @Query("SELECT * FROM Foo f"
        + "WHERE (?1 IS NULL OR f.bar = ?1)"
        + "AND (?2 IS NULL OR f.baz = ?2)")
    public List<Foo> findByOptionalBarAndOptionalBaz(
        Optional<Bar> bar,
        Optional<Boolean> baz);
}
```

Rather than this:

```java
interface FooRepo extends CrudRepository<Foo, String> {
    public List<Foo> findByBar(Bar bar);
    public List<Foo> findByBaz(Boolean baz);
    public List<Foo> findByBarAndBaz(Bar bar, Boolean baz);
}
```
