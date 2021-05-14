Journal 2021-04-27 - Chunking Lists for List-Length Limited Calls
==========

Motivating case: Oracle DB only supports 1000 elements with `IN (...)` clauses, 10,000 if you're willing to resort to the `('magic', field_name) in (('magic', ?), ('magic', ?), ...)` shenanigans of the Multiple Values In Clause.

Anyway, although this functionality supports that use case, this is actually useful anywhere we want to chunk large inputs.



## Chunking 1 List

This seems simple enough.

```java
public static ListChunkUtils {

    public static <T> List<List<T>> doForEachChunk(
        Integer chunkSize,
        List<T> list
    ) {
        return list.stream().reduce(
            new ArrayList<List<T>>()
            (List<List<T>> acc, T next) -> {
                Integer accSize = acc.size();

                // We check this here instead of just creating acc with an
                // initial empty list, because we want it to only have anything
                // if this iteratee is actually called at least once.
                if (accSize == 0) {
                    acc.add(new ArrayList<>());
                    accSize = acc.size();
                }

                List<T> lastChunk = acc.get(accSize - 1);

                if (lastChunk.size() > chunkSize) {
                    lastChunk = new ArrayList<>();
                    acc.add(lastChunk);
                }

                lastChunk.add(next);

                return acc;
            }
        );
    }
}
```

That's probably alright, since we're not creating any new list elements, just lists themselves.


### Stream of Chunks?

It'd be nice to be able to stream the chunks out to lazily generate the chunks.

Perhaps [something like this would work](https://stackoverflow.com/a/63380490)?

Basically,

- `ListChunkIterator<T> implements Iterator<List<T>>` which I probably should've considered in the first place but I was fixated on streams.
- `Spliterators.spliterator(Iterator<? extends T> iterator, long size, int characteristics)` (because we _do_ have the size, here.)
    - Like with the above snippet, `Spliterator.IMMUTABLE` will be (at least one of) the characteristic(s).
- `StreamSupport.stream(Spliterator<T> spliterator, boolean parallel)`

```java
@RequiredArgsConstructor
public class ListChunkIterator<T> implements Iterator<List<T>> {

    public static <T> Iterator<List<T>> of(int chunkSize, List<T> sourceList) {
        return new ListChunkIterator<T>(chunkSize, sourceList);
    }

    @Getter
    private final int chunkSize;

    @Getter
    private final List<T> sourceList;

    @Getter(lazy = true)
    private int sourceListSize = sourceList.size();

    @Getter(lazy = true)
    private int computedChunkCount =
        getSourceListSize() / getChunkSize()
        + ((getSourceListSize() % getChunkSize()) != 0 ? 1 : 0);

    private int currentChunkIndex = 0;

    @Override
    public boolean hasNext() {
        return currentChunkIndex < getComputedChunkCount();
    }

    @Override
    public List<T> next() {
        int currentStartIndex = currentChunkIndex * getChunkSize();
        int currentEndIndex = (currentChunkIndex + 1) * getChunkSize();

        currentEndIndex = currentEndIndex > getSourceList().size()
            ? getSourceList().size()
            : currentEndIndex;

        currentChunkIndex += 1;

        return getSourceList().subList(currentStartIndex, currentEndIndex);
    }

    // MAYBE: Overload that lets us specify Spliterator options?
    public Spliterator<List<T>> toSpliterator() {
        return Spliterators.spliterator(
            this,
            this.getComputedChunkCount(),
            Spliterator.IMMUTABLE
        );
    }

}
```

That gives us the quick energy we need to ~~escape~~ iterate.

```java
StreamSupport.stream(ListChunkIterator.of(1000, fooList).toSpliterator(), false)
    .forEach((chunk) -> { /*...*/ })
    ;
```

Amusingly, this looks similar to the default implementation of `Collection#stream()`:

```java
public interface Collection<E> extends Iterable<E> {

    default Stream<E> stream() {
        return StreamSupport.stream(spliterator(), false);
    }

}
```



## Chunking 2+ Lists?

What if we want to chunk 2 lists?

I suppose that also opens up the question of "what does it mean to perform an operation with two lists of chunks?"  I think the answer there would be to perform one operation for each combination of the two.

The only way to actually handle such a thing in Java would be to either create dedicated methods or dedicated classes, mostly because you can't do arbitrary tuples.

Hm.

```java
// .withChunksOf<T, U>(List<T>, List<U>): Chunky<Tuple2<List<T>, List<U>>
Chunky.withChunksOf(foo, bar)
    .withChunkSize(1000)
    // .mapAndMerge(Function<Tuple2<List<T>, List<U>>, List<R>>): List<R>
    .mapAndMerge((chunks) -> {
        return someRepo.findAllByFooInAndBarIn(chunks.get0(), chunks.get1());
    });
```

I think that would work, but hides the switch away in the Tuple, and loses meaningful variable names.

Also, it's likely Chunky here would still be implemented differently for the 1-arity case vs the n-arity case.

What if we did just use separate classes?

```java
// .withChunksOf<T, U>(List<T>, List<U>): Chunky2<T, U>
Chunky.withChunksOf(foo, bar)
    .withChunkSize(1000)
    // .mapAndMerge<R>(BiFunction<T, U, R>): Lsit<R>
    .mapAndMerge((fooChunk, barChunk) -> {
        // ...
    });
```

That's somewhat easier to work with, where the switch is instead moved to the multiple classes.

However, it means each class must reimplement any important operation itself, meaning we'd have total implementations of (Methods x Arities).

Ugh.

I'm leaning towards the tuples style for type safety reasons.

I suppose just using distinct methods could work.

```java
Chunky.withChunkSize(1000)
    // .mapAndMerge<T, U, R>(List<T> ts, List<U> us, BiFunction<T, U, R>): Lsit<R>
    .mapAndMerge(foo, bar, (fooChunk, barChunk) -> {
        // ...
    });
```

Thinking about it, that's really nice.  Easy to write, obvious, yeah.

Only place it loses is if more than one operation comes to light, but in this case we have a very specific use case so I think it's fine to just do this.

I think out of anything, it's basically this vs the tuples setup, and this wins out on usability.


### Stacking/Nesting Iterations?

Another possibility is to just nest things, something which might be weird for Java but is just another tuesday in FP land.

Basically, `Tuple2<A, Tuple2<B, Tuple2<C, void>>>`, that sort of thing.

Maybe call it something like this:

```java
Chunky.withChunkSize(1000)
    .chunk(foo).and(bar).and(zap)
    .mapAndMerge((foo) -> (bar) -> (zap) -> {
        // ...
    });
```

I guess it would need to keep track of both the chunks via `Tuple2`s and the callback via `Function`s.  The inner-most one could possibly be a `Tuple1` or something silly like that, just to signal the end of the road, though that might make typing Chunky a bit difficult.

So it'd end up like

```
Chunky<
    Tuple2<A, Tuple2<B, Tuple2<C, void>>>,
    Function<A, Function<B, Function<C, List<R extends Object>>>>
>;

Chunky.mapAndMerge<R>(Function<A, Function<B, Function<C, List<R>>>> mapper): List<R>
```

or something.  Not sure how to make `R` in `mapAndMerge` work there.

Or should it be `Tuple2<Tuple2<Tuple2<null, A>, B>, C>`?  No, that's basically the same thing just backwards.  Maybe just `Tuple2<C, Tuple2<B, Tuple2<A, null>>>`?

I'm not sure this is doable in Java's generics system.  Bleh.  Probably the sort of thing that drives people to Scala.


### Crossing Chunk Lists

Since we need to iterate each combination along each list of chunks, we basically need to cross all of them.

I'm guessing it'd end up as something like recursive flatmapping.

Not sure how to implement that off hand.  Some sort of producer backed by an internal stream?  Hm.

What might really happen is each next arity up would call the next arity down with a flat map iteratee that complects its upper chunk stream with the lower one.  In that way then every single combination would be called.  Eventually.

Or maybe we just do that to get the arbitrarily nested stream, the metastream if you will, that we then iterate over.  Or rather, with enough flat mapping we can create the stream of chunk combinations, over and over and over again until it is done.  We already can create a stream of just each chunk, so we then flat map each chunk to a stream of N+1 tuples of that first chunk with each next chunk, flat map again to a stream of each next chunk... On and on, arbitrarily iterating until we get the arity we want.

Granted, I'm not actually sure I need more than 1-arity for the current motivating use case.

Anyway, not something we need to worry about immediately, but fun to think about.



## Initial Implementation Sketches of Chunky, Multiple Methods Edition

So let's try out the version with multiple variations of `#mapAndMerge()`, or rather try out just the initial 1-arity version.

```java
public class Chunky {

    public static withChunkSize(Integer chunkSize) {
        return new Chunky(chunkSize);
    }

    @Getter
    private Integer chunkSize;

    protected Chunky(chunkSize) {
        this.chunkSize = chunkSize;
    }

    // QUESTION: What about Page<R>?  Just another overload?  Result combiner?  Hmm.
    // Probably just make both separately first, then figure it out later.
    public <A, R> List<R> process(List<A> itemsA, Function<List<A>, List<R>> chunkMapper) {
        return StreamSupport.stream(ListChunkIterator.of(getChunkSize(), itemsA).toSpliterator(), false)
            .map(chunkMapper::apply)
            .reduce(new ArrayList<>(), (acc, next) -> {
                // Only mutating it here because we also controlled the seed value.
                acc.addAll(next);
                return acc;
            });
    }

}
```

Could this be broken up a bit?

```java
public class Chunky {

    public static Chunky withChunkSize(Integer chunkSize) {
        return new Chunky(chunkSize);
    }

    @Getter
    private Integer chunkSize;

    protected Chunky(chunkSize) {
        this.chunkSize = chunkSize;
    }

    public <A> Stream<List<A>> streamListChunks(List<A> itemsA) {
        return StreamSupport.stream(
            ListChunkIterator.of(getChunkSize(), itemsA).toSpliterator(),
            false
        );
    }

}
```

Hm, by putting off the mapping and reducing for the moment, we get closer to the heart of what we're concerned with.


```java
public class Chunky {

    public static Chunky withChunkSize(Integer chunkSize) {
        return new Chunky(chunkSize);
    }

    @Getter
    private Integer chunkSize;

    protected Chunky(chunkSize) {
        this.chunkSize = chunkSize;
    }

    public <A> Stream<List<A>> streamListChunks(List<A> itemsA) {
        return StreamSupport.stream(
            ListChunkIterator.of(getChunkSize(), itemsA).toSpliterator(),
            false
        );
    }

}
```

What might the flatmap function mentioned elsewhere look like then?

```java
public static <O, I> Function<I, Tuple2<I, O>> crossWith(O outer) {
    return inner -> Tuple2.of(inner, outer);
}
```

Okay, that's ... not actually that helpful, that's just currying `Tuple2.of()`.  We need the actual flat mapper, though the above could be used by it.

We need: `outerChunk -> innerWhole -> Stream<Tuple2<outerChunk, innerChunk>>`

Maybe.  I think.

We have `whole -> Stream<chunk>`, so that's part of it.

Next then is `Stream<chunk> -> Stream<Tuple2<otherChunk, chunk>>` or something like that.

So maybe it's `otherWhole -> chunk -> Stream<Tuple2<otherChunk, chunk>>`?

```java
class Chunky {
    public static <A, B> Function<A, Stream<Tuple2<B, A>>> cross(
        List<B> otherList,
        Integer chunkSize
    ) {
        return givenItem -> Chunky.withChunkSize(1000)
            .streamListChunks(otherList)
            .map(otherItem -> Tuple2.of(otherItem, givenItem));
    }
}
```

Okay, using that then, we get...

```java
Chunky.withChunkSize(1000)
    .streamListChunks(listA)
    // otherWhole -> ...
    //   chunk -> Stream<Tuple2<otherChunk, chunk>>
    .flatMap(Chunky.cross(listB, 1000))
    .map((tuples) -> {
        return givenIteratee(tuples.get1(), tuples.get0());
    })
    .collect(reducingCollectorThingy)
    ;
```

And, 3?

```java
Chunky.withChunkSize(1000)
    .streamListChunks(listA)
    // otherWhole -> ...
    //   chunk -> Stream<Tuple2<B, A>>
    .flatMap(Chunky.cross(listB, 1000))
    // furtherWhole -> ...
    //   tuple -> Stream<Tuple2<furtherChunk, tuple>>
    .flatMap(Chunky.cross(listC, 1000))
    .map((tuples) -> givenIteratee(
        tuples.get1().get1(),
        tuples.get1().get0(),
        tuples.get0()
    ))
    .collect(reducingCollectorThingy)
    ;
```

Do we need to actually reduce it ourselves?  If it's just flattening it, can we just flatten it by flatmapping each result chunk to a stream of its elements?

```java
Chunky.withChunkSize(1000)
    .streamListChunks(listA)
    // otherWhole -> ...
    //   chunk -> Stream<Tuple2<otherChunk, chunk>>
    .flatMap(Chunky.cross(listB, 1000))
    // furtherWhole -> ...
    //   tuple -> Stream<Tuple2<furtherChunk, tuple>>
    .flatMap(Chunky.cross(listC, 1000))
    .map((tuples) -> givenIteratee.apply(
        tuples.get1().get1(),
        tuples.get1().get0(),
        tuples.get0()
    ))
    // Stream<List<R>>.flatMap(List<R> -> Stream<R>): Stream<R>
    .flatMap(Collection::stream)
    ;
```

Nice.  From there you can collect them or further process them however you want.  That includes adding things like "unique by" or whatever.

Given the above, we don't really need to separate the chunk size from the chunks lister either.  We could just do this:

```java
class Chunky {
    public static <A, B> Function<A, Stream<Tuple2<A, B>>> cross(
        List<B> otherList,
        Integer chunkSize
    ) {
        return givenItem -> Chunky.withChunkSize(1000)
            .streamListChunks(otherList)
            .map(otherItem -> Tuple2.of(givenItem, otherItem));
    }

    public static <A> Stream<List<A>> streamOfChunks(
        List<A> listA,
        Integer chunkSize
    ) {
        return StreamSupport.stream(
            ListChunkIterator.of(chunkSize, itemsA).toSpliterator()
        );
    }

    public static <A, R> Stream<R> streamOfMapping(
        Integer chunkSize,
        List<A> listA,
        Function<List<A>, List<R>> mapper
    ) {
        return streamOfChunks(listA, chunkSize)
            .map(mapper)
            .flatMap(Collection::stream);
    }

    public static <A, B, R> Stream<R> streamOfMapping(
        Integer chunkSize,
        List<A> listA,
        List<B> listB,
        BiFunction<List<A>, List<B>, List<R>> mapper
    ) {
        return streamOfChunks(listA, chunkSize)
            .flatMap(cross(listB, chunkSize))
            .map((tuple) -> mapper.apply(
                tuple.get0(),
                tuple.get1()
            ))
            .flatMap(Collection::stream);
    }

    public static <A, B, R> Stream<R> streamOfMapping(
        Integer chunkSize,
        List<A> listA,
        List<B> listB,
        List<C> listC,
        TriFunction<List<A>, List<B>, List<C>, List<R>> mapper
    ) {
        return streamOfChunks(listA, chunkSize) // List<A>
            .flatMap(cross(listB, chunkSize)) // Tuple<List<A>, List<B>>
            .flatMap(cross(listC, chunkSize)) // Tuple<Tuple<List<A>, List<B>>, List<C>>
            .map((tuple) -> mapper.apply(
                tuple.get0().get0(),
                tuple.get0().get1(),
                tuple.get1()
            ))
            .flatMap(Collection::stream);
    }
}
```

Hm.  I kinda dislike how `chunkSize` is always there and just taking up extra space.

```java
class Chunky {

    public static Chunky withChunkSize(Integer chunkSize) {
        return new Chunky(chunkSize);
    }

    @Getter
    private Integer chunkSize;

    protected Chunky(chunkSize) {
        this.chunkSize = chunkSize;
    }

    public <A, B> Function<A, Stream<Tuple2<A, B>>> cross(
        List<B> otherList
    ) {
        return givenItem -> streamOfChunks(otherList)
            .map(otherItem -> Tuple2.of(givenItem, otherItem));
    }

    public <A> Stream<List<A>> streamOfChunks(
        List<A> listA
    ) {
        return StreamSupport.stream(
            ListChunkIterator.of(getChunkSize(), itemsA).toSpliterator()
        );
    }

    public <A, R> Stream<R> streamOfMapping(
        List<A> listA,
        Function<List<A>, List<R>> mapper
    ) {
        return streamOfChunks(listA)
            .map(mapper)
            .flatMap(Collection::stream);
    }

    public <A, B, R> Stream<R> streamOfMapping(
        List<A> listA,
        List<B> listB,
        BiFunction<List<A>, List<B>, List<R>> mapper
    ) {
        return streamOfChunks(listA)
            .flatMap(cross(listB))
            .map((tuple) -> mapper.apply(
                tuple.get0(),
                tuple.get1()
            ))
            .flatMap(Collection::stream);
    }

    public <A, B, R> Stream<R> streamOfMapping(
        List<A> listA,
        List<B> listB,
        List<C> listC,
        TriFunction<List<A>, List<B>, List<C>, List<R>> mapper
    ) {
        return streamOfChunks(listA) // List<A>
            .flatMap(cross(listB)) // Tuple<List<A>, List<B>>
            .flatMap(cross(listC)) // Tuple<Tuple<List<A>, List<B>>, List<C>>
            .map((tuple) -> mapper.apply(
                tuple.get0().get0(),
                tuple.get0().get1(),
                tuple.get1()
            ))
            .flatMap(Collection::stream);
    }
}
```

And of course, using it:

```java
Chunky.withChunkSize(1000)
    .streamOfMapping(foos, bars, (foos, bars) -> {
        return someRepository.findAllByFooInAndBarIn(foos, bars);
    })
    .collect(Collectors.toList())
    ;
```

Streams allow us to delegate the end collection type to the caller, thus allowing us to polymorphize on arity without ending up with a matrix of methods by having to cross arity by return type.

The only possible issue is, well, `Page<T>`.  Need to check if that works with it.

Hm.

- `Page<T>` extends...
    - `Iterable<T>`
    - `Slice<T>`
    - `Streamable<T>`
    - `Supplier<Stream<T>>`
- `List<T>` extends...
    - `Collection<E>` which extends...
        - `Iterable<T>`

So, there's `Iterable<T>` and not much else.  The issue is, while both `Page<T>` and `List<T>` have a `#stream()` method, they come from different interfaces.  Ugh.  The only common thing is `Iterable<T>`, which means the only think we know we can get from them is `#spliterator()`.  Not the end of the world, but annoying never the less.



## Iterable Based Utils, Then?

So, if the only thing in common between List and Page is the Iterable super interface, I guess we can base things on that?  Won't help with the Page specific stuff, but at least we'll be able to collect everything.

That means we'd have to just chunk Iterables rather than Lists, but that's fine.  Probably.

It does possibly mean issues with sizing, or rather we'd have to include special-casing code just to check for sizing, assuming that's something we want.  It seems to be something we want, if the implementation notes on `#spliterator()` are any indication.


### What About Pages?

Not entirely sure what to do about Pages.

Actually, I'm not sure this sort of thing even makes sense with pages.

Maybe.

I'm not certain any of the current motivating cases actually paginate, either, so maybe this is a moot point.

Something to think about, I guess.

If I start with `Iterable<T>` though, then I can add special casing for `Page<T>` later, but given that we've had to chunk the input like this I'm not sure if it's ever going to be meaningful, and if anything like additional filtering or deduplication happens then it's right out.

`Page<T>` does provide "total item count" information, so it's maybe possible to piece together an aggregate `Page<T>` there but again only if no additional post processing occurs.
