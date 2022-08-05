Journal 2022-05-05 - Periodic Update on my Opinions on Front-End Architecture v2
================================================================================

It's been a little while since I last tried collecting and summarizing thoughts on this topic, and unfortunately the last time I did this made it pretty clear I really need to break this into a few separate documents.  That would hopefully make things a bit more navigable as well as make it easier to fold in new learnings.

While references will be made to Vue centric libraries, this is largely about front-end development of <abbr title="Single Page Applications, no sapping sentries here ... maybe sapping your will to live, though">SPAs</abbr> more generally.



## Overarching Ideals

Above all: a computer doesn't care about how things are organized, it simply does as it is told (which may not necessarily be what we _think_ we're telling it to do).  Organization is first and foremost about making things maintainable _by us humans_.

All of this is informed by a few over-arching ideals to strive for and balance between.

1. Less Spaghetti: Spaghetti is a tangled mess of noodles and sauce, and should stay on the dinner plate or bowl and out of the code base which, among many other points, lacks refridgeration.
1. Reduced Cognitive Burden: The more of the whole application you have to hold in your head at the same time, the more difficult it is to make a modification to any single part.  This informs everything from how to determine if a given injected service should even exist to how to handle routing between pages.
    1. Is especially applies to application state, because application state brings with it the combinatorial explosion of all the possible event sequences that could occur and what all possible states could result.
1. Incremental Familiarity: When coming into a given page, a new developer should only have to learn about that page itself and any injected services it makes use of.  They should not have to learn about any other pages to understand what this page does by itself, though learning about other pages may be important to learn the broader operational context within which the page operates.
    1. That is, the sum total of _how_ a page is _used by a user_ and _why it exists_ depends on the general knowledge of the rest of the application, but the _exact details_ of how one page ticks should _not_ depend on the _exact details_ of any other page.
1. Robust Operation in the Face of Volatile Clients: The fun thing about SPAs is the user can refresh the page frequently.  The page could also be refreshed for them, or their computer may decide now is a good time to restart.  The application should lose as little present state as possible in the face of such unexpected resets, and shouldn't freak out if reset in the middle of some interaction.
1. Deep Linkability: Any route that the user can navigate directly to must be navigable to purely via the route.  No other mechanisms should be necessary, no hidden state should need to be set.
    1. Just ask your QA team if they think being able to jump straight to specific pages in your app from the moment it's initialized is a nice thing to have.  If you don't have a QA team, you actually do: you yourself.
1. Treat Any Data Not Owned By the Current Unit as Immutable: the only data that can be mutated or otherwise manipulated by the current unit of code is that unit's own State.  All other data should be treated as read only and thus should only ever be derived from rather than mutated.
1. Organize code within a component by "why", not by "what".
    1. This is one of the big motivating factors behind the Composition API, the other being easier type safety.
1. Static typing is your friend.  Use TypeScript.
    1. You might hate it at first but type errors let you catch small bugs more quickly and thus frees you up to focus on the bigger issues like "what am I actually trying to do".
    1, Static types are documentation.  A purely dynamically typed codebase usually means frontloading learning what all types the various things deal with.  Static (or even inferred) typing allows us to more incrementally learn things.
    1. "But it doesn't matter at run-time" is the biggest non-excuse.  This works fine for Java (see Type Erasure) so it works fine here.  Sure, Java has other issues but anyway.  Static typing here isn't about runtime safety, it's about design time sanity.

Not sure if these go in the above or the below...

1. Flat Dependency Graphs Are Better Than Deep Dependency Graphs: ...
1. Explicit References and Imports of Features: Less magic, more affordances.
    1. Try to keep all integrations and features used by a given module explicitly stated/imported in that module.  Try to keep any global features or integrations explicitly stated and installed at the application's main entry point.
    1. This reduces the number of places someone should need to look in order to understad what any given unit of code is doing.
    1. This also means we should prefer avoiding the use of implicit globals or services, and instead prefer explicit import of such services or their interfaces, even if the underlying implementation relies on implicit globals.  Put another way, the imported interface makes the implicit into the explicit.
1. Composition is Better than Inheritance

These general ideals feed into some slightly-more-concrete ideals.

1. Loose Coupling Between Pages: Each page should be written as though it's the only page that currently exists in the app.
    1. No other pages exist, only their routes.  If navigating to a page requires more than just pushing a new route, then that is tight coupling between pages.
    2. Put another way, the Router forms the global interface of the UI application, and the various pages within that application should only navigate to the rest of the app via that public interface.
1. Don't Reimplement Native Browser Functionality: The most common example is using `onclick` to navigate instead of just creating an anchor with an `href`.
1. The Page Component as the Primary Integration Point: Anything that is not global to the entire application should be imported and installed locally only in any Page component that is using it.
    1. This reduces the number of places a person must look at to understand the current Page: that Page itself and the application entry point (aka the "main" file).
1. Injected Services must have well defined semantics: They should expose only methods and getters/read-only props, and should only be used by that public interface.
    1. The issue with global variables usually isn't so much that they're global, but that if you don't define clear and restricted (and tested!) ways to read and modify those variables you can end up with a mess.
        1. Further, you must always assume they will be interacted with by many different parts of the application simultaneously.
1. Most state management should be local to a component or at best a page, _or appear as such_ from the component's perspective.
    1. In the vast majority of cases, requested data should be either local to a given component or only interacted with via injected services, in which case the component itself isn't dealing with that data directly anyway.
    2. This is because a lot of data is going to be stale when the component or page goes out of scope, which generally means "when the user goes to a different page".
