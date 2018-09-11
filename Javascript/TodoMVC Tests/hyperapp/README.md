TodoMVC Test - hyperapp
=======================

Implementing (most of) TodoMVC using the elmish-looking [hyperapp](https://github.com/jorgebucaran/hyperapp).  (NOTE: As of writing, this is using hyperapp V1 and V2 is under active development.)

As this is only ~1kb, in modern browsers this is very nice on the bandwidth budget.  Add to that a pure-functional-by-default mode of operation coupled with life-cycle hooks that operate on the element itself and you get a very tidy way to build UIs in a safety-first-but-still-pragmatic manner.  Not as friendly if you like class based components, but if you're fine treating data as just data, then this might be another fun framework to try.

Builds using Webpack because developers must download a minimum of butt tonnes of JS.  (And we know that code cannot lie.)



## Thoughts

I like this.  It's definitely nice as a minimal way to sprinkle interactivity into a page.  At only ~1k compressed by itself, you can easily include it just about anywhere.  You could, say, include hyperapp at the top, then include the widget code at the bottom, or even just after the widget container.  Use data props on the target container then to add extra configuration.

The Elm-esque `view :: (Model, Actions) => Node` setup appeals to my more functional side while the library still enables easy pragmatism where necessary.  The Todo app JS is ~12k unminified, not counting the Router.  The complete build, with all dependencies, is 20k before compression, 8k zipped.  That's the size of Mithril by itself.

There are teasings at how to mount to server-rendered markup, but I think most of the time if you want an interactive widget using this, you'll probably want to just blow the markup away, anyway, unless you're writing a SPA.  Also, at the time of writing, probably better to wait until hyperapp V2 releases.

Why this over jQuery 3?  Size.  Granted, older browsers will require some polyfills which will kill the size argument...
