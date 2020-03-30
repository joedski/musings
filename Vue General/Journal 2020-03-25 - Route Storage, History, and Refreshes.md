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

Though at that point, we might as well just `class BetterRouter extends Vue.Router`.  In fact, you could do that to override the navigation methods, then also install a route guard while constructing the instance to add that information to the next route's metadata... Hm.


### Anything Else?

The over all problem is just one of storing arbitrary route-specific information.  By using Vue Router we're limited to what it exposes, or what we can bodge on top of it.

I don't like doing things that involve the internals because that's fragile and can potentially change greatly even from patch-version to patch-version, let alone minor-version to minor-version.  It should probably be kept on the table as an option, but again, oof.

Also depends on just how the hash routing works, though I don't think we're going to bother with it.  Any initial implementation in our app would be specific to history mode.


### Curiousity: When Refreshing, Objects on `route.query` Are Preserved

You're not supposed to stick non-String values on `route.query`, but people do, and, interestingly, these objects survive a refresh.  Hm.

Perhaps route metadata also will survive a refresh?  If so, that could give us the easiest option: Unique ID based store in the form of Map<ID, KV>.

This could be down to the fact that the History API allows you to push arbitrary values in there.  Hmmmmm.

Dunno how to handle cache invalidation, though.  an LRU would be a good default, and some page metrics could inform a reasonable default value for that, mostly in the form of "how many times do people back track in a given session?".  10 entries is probably a reasonable start?  Maybe 20, then.

At the very least, the Unique ID idea should be tried first.


### Thought: If Metadata Is Preserved Across Refreshes, Why Not Just Use It As The Store?

I guess another question is: is the metadata read-only once a component receives it?

Or, perhaps more importantly, once a component receives a route, does modifying that route persist changes to the History stack?

May be worth experimenting with, but I'm inclined to say no.  Or, at least, that things on `$route` should be treated as Read Only lest you invoke nasal demons. (or want to test on every browser.  Ew.)
