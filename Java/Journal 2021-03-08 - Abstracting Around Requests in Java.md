Journal 2021-03-08 - Abstracting Around Requests in Java
========

I'm a fan of separating data/description and execution, so I really don't care for how most apps setup HTTP calls to other services.  Just give me a config object/interface and let me throw it at a single executor.  Bam, done.

Want to create specific methods?  Just make them Request Config creators.  Boom.

Why not just call the request executor in those specific methods?  I mean, you can, so long as your setup allows you to arbitrarily wrap the request executor to tie in any added integrations you need.

I think that would end up looking something like

```java
public interface HttpRequestConfig<Q, A> {

  public String getUrl();
  public HttpRequestConfig<Q, A> setUrl();

  public HttpRequestConfig<Q, A> setRequestBody(Q requestBody);

  public A validateResponseBody(Object parsedResponseBody) throws ValidationExceptionOrWhateverIdfc;

  // ... yeah I dunno I just started writing this because I got mildly frustrated.

}
```

There's probably something that _does_ use this style of API out there, somewhere, but heck if I know.  This was spur of the moment, don't feel like searching for it just yet.
