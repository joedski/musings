Journal 2019-05-20 - On ID Selectors and Not Using Them to Scope Module Styles
=======

There was recently a discussion at my workplace about using ID Selectors to scope styles to a component.

I disagreed with this, but it took me a bit to surface my actual reasons for disagreeing.

In the end, I had a few technical points and one semantic point.  I'll keep the semantic one separate because it may not convince people who feel writing Vue apps already ruins some of the semantics of HTML so why bother.

The semantic point was this:

- There should only be one of any given `id` in a given Document.
    - While perhaps not commonly used with Vue code, this will cause undefined behavior with `document.getElementById()`.  Which one will be returned?  Who knows.  Probably the first one, but maybe not!
    - Also this would obviously not work with hashes in the URL, but it's unlikely the `id` of a component would be used there, anyway.
    - Browsers do not break if multiple elements have the same `id` for the same reason they handle other HTML Spec Violations: They have to deal with the bullshit of the entire world.  Breaking on this violation would probably break quite a few sites.

The technical arguments regarding were thus:

- It raises the specificity of the nested selectors.
    - Originally, this is actually why one person was using it, to raise selector specificity so that one component's own styles would override any others.
    - I argue however that this makes things less maintainable:
        - Now if you want to apply utility classes, you must make sure those utility classes tag everything with `!important`.  Many times, this is the case, but now it is non-optional.
        - It also obligates any other styles that you _do_ want to apply to have at least 1 ID Selector in their Selector Line.
            - Note that it does not need to be the same ID selector!
    - This makes specificity just a little bit harder to deal with, adding to the microfrustrations of dealing with project styles generally.
    - As noted in the other points, it does not completely solve the underlying issue of style leakage due to using the same class name.
- It is Surprising.
    - At least, it was to me.
        - I've never seen anyone use IDs to scope styles to a module, and I've never seen anyone advocate such a practice.
- It doesn't actually protect from style overrides arising from name conflicts.
    - One person who advocated for this strategy said it was to protect a component's own styles from a parent component's styles.  It might have worked incidentally, but it didn't actually solve the underlying issue, which is that _common class names greatly increase the chance of style leakage_ regardless of how specific your selector is!  In fact, I would argue that over the lifetime of a project, it makes it inevitable.
        - Indeed, it doesn't solve that issue of common-class-name-induced style leakage at all, just makes occurrences more subtle when they do arise.  It is only guaranteed to work if it assumes a certain order of selector declaration in the HTML Document!
            - This is intrinsically tied to the next point.
        - Remember also that `#parent .bar .foo` is more specific than `#child .foo`!
- It assumes a certain module loading/bundling/importing order, and assumes whatever bundling methodology is being used will insert the styles into the document in a specific order.
    - That is, given `#first .foo` and `#second .foo`, if the `#second` declaration comes later in the Document than the `#first` declaration, the `#second` one will always win for _any_ element that matches `#second .foo`, regardless of how deeply nested that `.foo` is.
    - Anything that assumes a certain code order like that is just asking for subtle errors down the road.  _This is absolutely not something we should be thinking about when writing styles for components._
        - Further, it assumes this order in perpetuity.  (or at least over the lifetime of the project.)
    - Any changes to the ordering can cause unexpected style overrides to occur.  In fact, it should be considered a source of non-determinism, especially when loading components async.
    - While one may argue that the application will always have a given order of styles just due to the order of imports, this is both true and exactly the problem.
        - In a single file, we can assume, provided whatever is actually processing the styles for our bundler works in this manner, that the styles so-named will be loaded in the order they appear in that specific single file.
        - What this says nothing about is the order of styles loaded _in entirely different modules whose loading orders are not necessarily related to each other._
- It ~~can~~ will inevitably leak a component's own styles out into any children.
    - The only way to prevent this is to either use a direct-child combinator, or to give things globally unique names, at which point you've defeated the original point of using ID selectors.
    - You could also do this by using Vue Scoped Styles, but that again obviates the need to use an ID selector.
    - It ~~may~~ will almost certainly leak styles in ways you didn't expect, such as into common components like Buttons or Banners!

Someone said that they'd expected Vue's Scoped Styles to do this for them, but that's not what Scoped Styles do; rather, Scoped Styles are designed to keep a component's own styles from leaking out.

My current least-worst solution is to just use a global naming convention such as BEM, that specific one being my current default.

- It does not assume any order of components' styles declarations, and thus also does not depend on the the loading/bundling/import order of those components.
- It scopes styles by giving them globally unique names.
- It's unsurprising.
- It's verbose, which is great when inspecting the DOM, but super annoying in the template.  Oh well.

Another option is to just always use scoped styles, if you're using Vue.

- If some of your components' styles are scoped and some are not, that's (probably) a bug.
    - Either make them all scoped, or make don't.
        - Special exceptions include Transition Classes, which should be left unscoped.  May want to consider either BEM-named or just making them globally shared.
