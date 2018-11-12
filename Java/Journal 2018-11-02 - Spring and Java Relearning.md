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


### Query Methods

The quickest option for basic queries is to just [write it out as the method name of your repo interface](https://docs.spring.io/spring-data/jpa/docs/current/reference/html/#jpa.query-methods), and the framework [parses the name](https://docs.spring.io/spring-data/jpa/docs/current/reference/html/#repository-query-keywords) into its intermediate SQL, which then gets translated into the target native SQL.

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

One advantage of the latter is that it doesn't presuppose not wanting to check against null values.  A service might switch behaviors, null omitting or null checking, depending on various conditions.

Of course, one could argue that Optional clearly signals this, too.


### Optional Lists

Spring's query-from-method-name builder already supports the `IN` operator, but the problem is that its default behavior is to treat an empty list as an Always False.  That is, a an empty list selects nothing.  As [noted here, under the hood Spring creates `criteriaBuilder.disjunction()` for an empty list](https://rzymek.github.io/post/jpa-empty-in/), [which its query builder treats as `FALSE`](https://docs.oracle.com/javaee/6/api/javax/persistence/criteria/CriteriaBuilder.html#disjunction()).

The solution of course is to use the same query building machinery to specify the desired behavior, in our case to treat empty lists as "Ignore this filter":

```java
// Note the second base, JpaSpecificationExecutor
interface FooRepo extends CrudRepository<Foo, String>, JpaSpecificationExecutor<Sample> {
    // `default` lets you specify a default implementation in an interface.
    default List<Foo> findFoosBy(
            List<Bar> bar,
            // Why baz?  Could be tristate: true, false, null.
            List<Boolean> baz) {
        return findAll((root, criteriaQuery, criteriaBuilder) -> {
            // Give us an `AND`-bunch.
            // Empty conjunction becomes a `TRUE`.
            Predicate predicate = criteriaBuilder.conjunction();

            if (!bar.isEmpty()) {
                predicate = criteriaBuilder.and(predicate,
                    root.get("bar").in(bar));
            }
            if (!baz.isEmpty()) {
                predicate = criteriaBuilder.and(predicate,
                    root.get("baz").in(baz));
            }

            return predicate;
        });
    }
}
```

It feels almost like JS.

Of course, you could go Full Java and put everything in constants-classes and query objects.

```java
import com.example.ex.constants.Foo_;
import com.example.ex.representation.FoosSearchQuery;

interface FooRepo extends CrudRepository<Foo, String>, JpaSpecificationExecutor<Sample> {
    default List<Foo> findFoosBy(
            FoosSearchQuery searchQuery) {
        return findAll((root, criteriaQuery, criteriaBuilder) -> {
            Predicate predicate = criteriaBuilder.conjunction();

            if (!searchQuery.getBars().isEmpty()) {
                predicate = criteriaBuilder.and(predicate,
                    root.get(Foo_.BAR).in(searchQuery.getBars()));
            }
            if (!searchQuery.getBazzes().isEmpty()) {
                predicate = criteriaBuilder.and(predicate,
                    root.get(Foo_.BAZ).in(searchQuery.getBazzes()));
            }

            return predicate;
        });
    }
}
```

On the one hand, verbosity.  On the other hand, documented interfaces.

It also means we don't need to expand the `findFoosBy` interface to add more items:

```java
import com.example.ex.constants.Foo_;
import com.example.ex.representation.FoosSearchQuery;

interface FooRepo extends CrudRepository<Foo, String>, JpaSpecificationExecutor<Sample> {
    default List<Foo> findFoosBy(
            FoosSearchQuery searchQuery) {
        return findAll((root, criteriaQuery, criteriaBuilder) -> {
            Predicate predicate = criteriaBuilder.conjunction();

            if (!searchQuery.getBars().isEmpty()) {
                predicate = criteriaBuilder.and(predicate,
                    root.get(Foo_.BAR).in(searchQuery.getBars()));
            }
            if (!searchQuery.getBazzes().isEmpty()) {
                predicate = criteriaBuilder.and(predicate,
                    root.get(Foo_.BAZ).in(searchQuery.getBazzes()));
            }
            // scalar filter
            if (searchQuery.getIsFrangible() != null) {
                predicate = criteriaBuilder.and(predicate,
                    criteriaBuilder.equal(root.get(Foo_.IS_FRANGIBLE), searchQuery.getIsFrangible()));
            }
            // list where null is a valid element
            if (!searchQuery.getListWithNulls().isEmpty()) {
                // NOTE: Usually NULL in a list is ignored by SQL,
                // not sure if that's the case with JPA or not when building a Postgres query.

                // Another way to do this in more complicated cases is basically the same
                // as the way we build the main predicate: Have a local predicate var
                // that we replace with more built upon predicates as certain conditions
                // are checked.
                // For single cases, though, a simple ternary expressing is okay.
                Predicate isNullPredicate = searchQuery.getListWithNulls().stream()
                    .anyMatch(el -> el == null)
                    ? criteriaBuilder.isNull(root.get(Foo_.LIST_WITH_NULLS))
                    : criteriaBuilder.disjunction()
                    ;

                predicate = criteriaBuilder.and(predicate,
                    criteriaBuilder.or(
                        isNullPredicate,
                        root.get(Foo_.LIST_WITH_NULLS).in(searchQuery.getListWithNulls())));
            }

            return predicate;
        });
    }
}
```
