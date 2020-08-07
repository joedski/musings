Journal 2020-08-04 - Simple Memoizations of Lambdas
========

Not much to really say here, these are pretty obvious.  I just wanted to scratch the itch.  Maybe I'll use them, or actually look for [something](https://stackoverflow.com/questions/27549864/java-memoization-method) [better](http://bendra.github.io/java/lambda/functional/memoization/guava/2014/12/08/functional-programing-memoziation-java-8.html)?

Amusingly, that second one looks more like JS with closing over the cache variable rather than having an instance property.  Also uses a thread-safe `ConcurrentHashMap` which I didn't think about, and the method `#computeIfAbsent` of course, that eliminates the need to do the noisy `if (containsKey) {...}` stuff myself.

```java
public class MemoizedSupplier<T> implements Supplier<T> {
  private boolean isComputed;
  private T computedResult;
  private Supplier<T> implementation;

  public MemoizedSupplier(Supplier<T> implementation) {
    this.isComputed = false;
    this.computedResult = null;
    this.implementation = implementation;
  }

  public T get() {
    if (isComputed) {
      return this.computedResult;
    }

    this.computedResult = this.implementation.get();
    this.isComputed = true;

    return this.computedResult;
  }
}
```

```java
public class MemoizedFunction<T, R> implements Function<T, R> {
  private Map<T, R> cache;
  private Function<T, R> implementation;

  public MemoizedFunction(Function<T, R> implementation) {
    this.implementation = implementation;
    this.cache = new HashMap<>();
  }

  public R apply(T arg) {
    if (!this.cache.containsKey(arg)) {
      this.cache.put(arg, this.implementation.apply(arg));
    }

    return this.cache.get(arg);
  }
}
```

```java
public class Memoize {
  public static <T> Supplier<T> memoize(Supplier<T> implementation) {
    return new MemoizedSupplier<>(implementation);
  }

  public static <T> Function<T> memoize(Function<T> implementation) {
    return new MemoizedFunction<>(implementation);
  }
}
```
