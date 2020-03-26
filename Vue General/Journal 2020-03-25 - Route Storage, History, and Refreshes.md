Journal 2020-03-25 - Route Storage, History, and Refreshes
========

Musing on a generic interface for caching route/history state specific data that can survive refreshes.

Basically, reimplement form history because we're a SPA and not a series of separate pages.  You know all the nice things that Browsers do with normal pages?  Do that, but again, (and shoddily implemented).

Thoughts:

- Route/History suggests either Unique ID Map<ID, KV> store or WeakMap<Route, KV> store.
- Refresh suggests serializability with Session Storage.
- Interface exposed would be rather similar to a Storage type thing, a low level interface upon which others should be built.

Second Pass:

- Data must survive refreshes to retain browser like behavior.
    - Must be backed by Session Storage, in some way.
- Data must be serializable.
    - This is to support the most storage solutions possible.
- Interface should prefer familiarity.
    - Since data must be serializable, implementing a Storage-like interface would be reasonable.
- Serializable and non-State based means parallel data structures and management.  Probably.
    - So a parallel stack to the History State stack.



## Feasibility

Ideally, all that would be required is a global Navigation Guard, added by "afterEach" or something.  However, the issue here is that we don't have a way to tell if router is going forward or backward, we only know the route is changing.


### Thought: Watching history.length

Checking the browser History interface, the only hint at what direction the history has gone is `window.history.length`.  Checking that before then again after the new history state is pushed allows us to detect whether or not the user went forwards or backwards, or whether a state replacement occurred.

Ideally, we do not care how many things happened so long as we know if we went backwards, forwards, or replaced.  In all likelyhook, though, the raw delta would be provided so that the parallel stack can be maintained.

It's annoying that we cannot check the history state stack, but oh well.

Thinking about this, `history.length` probably does not change if you just go back any number of routes, it probably only changes when going forward or replacing the current route if you went backward before.  That's annoying.


### Thought: Wrapping the Router Instance

Another thing we can do is use `Object.create()` to wrap the router instance with custom functionality for all the navigation methods, but that assumes those methods are also all what's used by everything ranging from other components to pre-made link components.


### Anything Else?

The over all problem is just one of storing arbitrary route-specific information.  By using Vue Router we're limited to what it exposes, or what we can bodge on top of it.

I don't like doing things that involve the internals because that's fragile and can potentially change greatly even from patch-version to patch-version, let alone minor-version to minor-version.  It should probably be kept on the table as an option, but again, oof.

Also depends on just how the hash routing works, though I don't think we're going to bother with it.  Any initial implementation in our app would be specific to history mode.
