Journal 2022-07-08 - Encoding HTTP Requests in Java with RestTemplate and WebClient
===================================================================================



Usage Comparison
----------------

Example using `RestTemplate`:

```java
String uri = "https://www.example.com/thingies";

RestTemplate restTemplate = new RestTemplate();
ResponseEntity<List<Thingy>> response = restTemplate.exchange(
  uri, HttpMethod.GET, null,
  new ParameterizedTypeReference<List<Thingy>>(){}
);
```

And an equivalent using `WebClient`:

```java
String uri = "https://www.example.com/thingies";

// Can be used asynchronously...
Flux<Thingy> thingyFlux = WebClient.create()
  .get()
  .uri(uri)
  .retrieve()
  // Alas, poor HTTP headers...  We knew them, Horatio.
  // Use .bodyToMono(klass) to get a single item.
  .bodyToFlux(Thingy.class);

// ... or synchronously.
List<Thingy> = thingyFlux.collectList().block();
// A single item just requires .block(), no .collectList()
```



Usage By the Rest of the App
----------------------------

Once we get to thinking about the rest of the app, things get a bit different: the rest of the app shouldn't actually care what the underlying mechanism is, only what it puts in and gets out.

I mean, technically the rest of the application always cares because all abstractions are leaky but that's not the point.

So a function is sufficient, right?

Well, Java doesn't let you just make functions and neither of the above mechanisms let you just slap a bag of parameters into them so we're stuck with putting the implementation in each one.  Which is fine, since in either case there'd always be some sort of "let me twiddle the knobs of `RestTemplate` or `WebClient` directly" escape hatch anyway that would create a tight binding to whichever mechanism is used.

Anyway, my point is that I think the best way to encode requests is in separate classes, and that the only sorts of groupings of those requests together should be into convenience services.  Outside of that, there's no real value to getting any fancier, because putting multiple things into classes adds the temptation to try to generalize across them which might limit independent evolution, or tempt one to pollute an existing class with different use cases of the same request.

Ultimately though, it's not much of a distinction outside of just where the organization occurs: at the method level or at the class level?

I prefer class level, as it keeps them all completely separate, and I like them being separate.  Compose each request separately out of whatever tools you're using, and let them exist apart from each other.  Deprecate old ones and bring in new ones as necessary.


### Interface Sketch

Basically a request would look something like this:

```java
public interface ParametricHttpRequest<P, R> {
    P getParameters();
    R execute();
}

public interface NonParametricHttpRequest<R> {
    R execute();
}
```

Okay, not very helpful, since the actual parameters are different between each request, and because of the way Java works we have to define separate interfaces for paramtric and non-paramtric but still.

The usage pattern then is simply:

1. Create request, maybe with parameters.
2. Execute request.

Or more Javaly:

```java
WhateverDto response = new FooRequest(new FooRequest.Parameters(foo, bar)).execute();

// Alternatively,
WhateverDto response = FooRequest.executeOn(foo, bar);
```

For those that use the new WebClient stuff, we can add:

```java
public interface ParametricAsyncableHttpRequest<P, R, S extends Publisher<R>>
extends ParametricHttpRequest<P, R> {
    S executeAsync();
}

public interface NonParametricAsyncableHttpRequest<R, S extends Publisher<R>>
extends NonParametricHttpRequest<R> {
    S executeAsync();
}
```

Because some methods return `Flux<T>` and some return `Mono<T>` and the only thing they have in common is `Publisher<T>`, that's just what this has to return.  Now, it could just return `Publisher<T>` and be done with it but why not be specific about returning one thing or many things?

Thinking about the vast majority of use cases though, I think I'd just return `Mono<T>` because for most loads we actually just want to get the whole collection or else we're getting back a `Page<T>` of stuff, not just a `List<T>` of stuff, and the moment we discard something is the moment we set ourselves up for future headache.

Though, granted, the future headache is obviated by just creating a different request class, which is half the point of creating separate request classe in the first place: independent evolution.


### Even Higher Level With Async?

The above is really about just slapping something down quickly, but typically when you move into the realm of streams you see the pattern of "Flatmap Requests into Responses", that is:

```
someRequestor :: Parameters -> Stream<Response>
responseStream = parameterStream.flatMap(someRequestor)
```

I suppose that could be easily bodged on by just returning a `Function<P, R>`:

```java
public interface ParametricAsyncableHttpRequest<P, R, S extends Publisher<R>>
extends ParametricHttpRequest<P, R> {
    // just pretend this actually is a thing for illustrative purposes.
    static Function<P, S> getProjector();
    S executeAsync();
}

public interface NonParametricAsyncableHttpRequest<R, S extends Publisher<R>>
extends NonParametricHttpRequest<R> {
    // just pretend this actually is a thing for illustrative purposes.
    static Function<P, S> getProjector();
    S executeAsync();
}
```

thus you could easily just do:

```java
fooStream = Mono.of(new FooRequest.Parameters(foo, bar))
    .flatMap(FooRequest.getProjector());
```

Now granted that makes no sense in isolation, and it's more of a way to stay in the realm of streams if you're already in it.  If you're not, then you're better off just using the regular imperative methods.

Also `getProjector` is a pretty terrible name, but yanno, names are hard.
