Journal 2021-08-25 - Who Handles Navigation, Parent or Children?  Navigation and the Single Level of Abstraction Principle
==========================================================================================================================

Typically when creating a Page Component, that component exists as itself and so it handles navigation to other parts of the app.  This is simple enough to understand:

- There's not really any other place for a Page Component to do that, nor any thing else for it to delegate that to.
    - The Router mechanism is already the lowest level, and the Page Component is thus already interfacing with that lowest level.

When it comes to Page Components with Children, the question gets mildly more complicated, but I've found the answer to be essentially the same:

- The Page Component itself, which is the Parent for any of its Children, should contain all that Navigation.
- The Children should instead merely emit events.

There's a few reasons I've concluded as such:

1. It keeps things that affect global state in 1 place as much as possible.
    1. The current Route is very much global state in the application, and the fewer places we update that the easier things are to understand.
2. It further reflects the props-and-events style of parent-child interaction, which makes child implementations more uniform.
    1. This also touches upon child statefulness, in that it further reinforces that one should minimize the amount of state and global state interaction within child components.
    2. Keeping state interaction as much as possible to props and events necessarily also means reducing the other kinds of state interaction as much as possible.
3. Because of those, it also further reflects the principle of [single levels of abstraction](http://www.principles-wiki.net/principles:single_level_of_abstraction).
    1. Because all of the navigation is in the parent, future developers do not need to look at every single child to understand what all navigations can occur from this page.
        1. This also applies to refreshes, which are essentially a special case: "re-navigate to this current page".
    2. Because all of the navigations are caused either by components on the parent page or, more likely, by well named events coming from children it is easy to see just what causes each navigation.
