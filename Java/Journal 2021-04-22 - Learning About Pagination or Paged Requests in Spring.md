Journal 2021-04-22 - Learning About Pagination or Paged Requests in Spring
========

I've actually poked this topic before but haven't readily captured it for later reference.  However, that means this'll likely be short.

A [somewhat more in depth overview can be found on Reflectoring](https://reflectoring.io/spring-boot-paging/).

There's two things:

1. The [`Pageable` interface](https://docs.spring.io/spring-data/commons/docs/current/api/org/springframework/data/domain/Pageable.html)
2. The [`PageRequest` class](https://docs.spring.io/spring-data/commons/docs/current/api/org/springframework/data/domain/PageRequest.html) and [its `of` constructors](https://docs.spring.io/spring-data/commons/docs/current/api/org/springframework/data/domain/PageRequest.html#of-int-int-).
3. The [`Page` interface](https://docs.spring.io/spring-data/commons/docs/current/api/org/springframework/data/domain/Page.html), which is both a [`Slice`](https://docs.spring.io/spring-data/commons/docs/current/api/org/springframework/data/domain/Slice.html) and a [`Streamable`](https://docs.spring.io/spring-data/commons/docs/current/api/org/springframework/data/util/Streamable.html), for keeping all the pagination metadata with the collection of data.

And some other related bits and bobs:

1. The [`Sort.by()` constructor](https://docs.spring.io/spring-data/commons/docs/current/api/org/springframework/data/domain/Sort.html#by-org.springframework.data.domain.Sort.Order...-) and its friends the [`Order.asc()` and `Order.desc()` constructors](https://docs.spring.io/spring-data/commons/docs/current/api/org/springframework/data/domain/Sort.Order.html#asc-java.lang.String-).
2. The [`@PageableDefault()` endpoint-parameter configuration annotation](https://docs.spring.io/spring-data/commons/docs/current/api/org/springframework/data/web/PageableDefault.html)
3. The `@SortDefault.SortDefaults()` endpoint-parameter configuration annotation with its array of `@SortDefault()`s.

Where do we usually encounter these things?

1. Controller method parameters.
2. Repository method parameters.
3. Contruction of Pageables using `PageRequest.of()`.



## Controller Method Parameters

This lets us bundle up a whole bunch of page stuff into a nice neat uniform interface.

Basically, we add this:

```java
class MyController {

    @GetRequest('/foos')
    public getFoos(
        @PageableDefault(page = 0, size = 10)
        // @SortDefault.SortDefaults({...}) if you want that.
        Pageable pageable
    ) {
        // ...
    }

}
```

And Spring automagically creates a Pageable from the query params, slurping up the following:

- `page`
- `size`
- `sort`, 0-n times.

Yes, passing the `sort` parameter multiple times is supported, and in fact perfectly normal query param behavior.  Each value for `sort` should be in the form of `${fieldName},${ascOrDesc}`, so `id,asc` or `name,desc`.


### Aside: If You Only Need Sort, You Can Use That By Itself

Sometime, you don't actually have pages, you just need the Sort.  Spring supports that too!  Fancy.

```java
class MyController {

    @GetRequest('/foos')
    public getFoos(
        @SortDefault.SortDefaults({
            @SortDefault(sort = "id", direction = Sort.Direction.ASC)
            @SortDefault(sort = "name", direction = Sort.Direction.DESC)
        })
        Sort sort
    ) {
        // ...
    }

}
```



## Repository Method Parameters

Not much to say here.  Any repository method where Hibernate is generating the implementation (automagical query-from-method-name methods, non-native/HQL Query methods) you can just tack on a `Pageable` parameter to the method interface and Hibernate will automagically handle that too.  If you're doing this, you might want to also use `Page<T>` as the return type so that you keep the associated metadata (including number of pages!) associated with the collection.

> NOTE: Like with Controller Methods, if you only need Sorting, you can add a `Sort` parameter instead of a `Pageable` parameter to the method interface.

For Criteria Queries and Native Queries, things are a little more involved.  Maybe I'll come back to expand on this at some point, but in short...

- Criteria Queries, you just have to put each field of the Pageable into the appropriate method of the TypedQuery or whatever it is.
- For [Native Queries](https://docs.spring.io/spring-data/jpa/docs/current/reference/html/#_native_queries), there's [some sort of thing with count queries](https://stackoverflow.com/a/42115966) you have to add to fully support them.
