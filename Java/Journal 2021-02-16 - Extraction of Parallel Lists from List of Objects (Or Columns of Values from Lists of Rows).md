Journal 2021-02-16 - Extraction of Parallel Lists from List of Objects (Or Columns of Values from Lists of Rows)
========

Something that sometimes comes in handy when querying DBs but admittedly isn't always that useful in other logic.

Okay, that's kind of a bad statement because that describes a lot of utilities, so doesn't really say much here.

Anyway, given `List<SomeDto>` I want `Tuple2<List<A>, List<B>>` or `Tuple3<List<A>, List<B>, List<C>>` where `A` is the type of one member var of `SomeDto`, `B` is the type of another member var of `SomeDto`, etc.

Put another way, treating `SomeDto` as rows of a table, I want lists of values in each column instead.

Put another way, I want to transpose my data.

I can't think of any reasonable way to really do this without separate Tuple classes because Java, so here's this.

```java
public class Transpose {

    public static <T, A, B> Tuple2<List<A>, List<B>> from(
        List<T> rows,
        Function<T, A> columnAGetter,
        Function<T, B> columnBGetter
    ) {
        List<A> columnA = new ArrayList<>();
        List<B> columnB = new ArrayList<>();

        for (T row : rows) {
            columnA.add(columnAGetter.apply(row));
            columnB.add(columnBGetter.apply(row));
        }

        Tuple2<List<A>, List<B>> columns = new Tuple2<>(columnA, columnB);

        return columns;
    }

    private Transpose() {}

}
```

Seems reasonable enough.  What if we want to be able to guarantee only unique values by `equals(b)`?  With at least 1 less instantiation?  The above would require essentially `new List<>(new Set<>(new List<>(...)))`.  I mean, it's not too bad but still.

```java
Tuple2<Set<A>, Set<B>> = Transpose
    .from(rows)
    .into(Collectors.toSet())
    .collectingColumns(
        SomeDto::getFoo,
        SomeDto::getBar
    );
```

Actually, reading up on all the Stream methods would help.  Just use `Stream<T>#distinct()`.

```java
Tuple2<List<A>, List<B>> = Transpose
    .from(rows)
    .with(Stream::distinct)
    .into(Collectors.toList())
    .collectingColumns(
        SomeDto::getFoo,
        SomeDto::getBar
    );
```

Nice.

Maybe also explicit support for not-null?

```java
Tuple2<List<A>, List<B>> = Transpose
    .from(rows)
    .with(Stream::distinct)
    .into(Collectors.toList())
    .collectingColumnsNotNull(
        SomeDto::getFoo,
        SomeDto::getBar
    );
```

I wonder how necessary this actually is.  Maybe the Stream API already has something for this?
