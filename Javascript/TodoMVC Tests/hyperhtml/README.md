TodoMVC Test - hyperHTML
========================

This view render lib has automatic bonus points due to having "Hyper" in the name not just once, but _twice_, which means it's at least twice as good as normalHTML.  Apparently some people think that's stupid, but they're themselves just too stupid to understand that more hyper is more better.

Okay, but seriously, [hyperHTML](https://viperhtml.js.org/hyperhtml/documentation) is pretty slick looking: It takes advantage of specification/implementation details of ES6 Tagged Template Literals to create something that looks as intuitive string interpolation but runs performant DOM updates.  It doesn't track a VDOM, and thus doesn't incur the memory footprint that comes with that.  Allegedly, it is the fastest, thus the 2x Hyper.  Let's just rename it H<sup>Two</sup>ML because it's winning.

Aside: I also worked on learning Webpack 4 and Webpack Dev Server setup here, so mlep.



## Most Streams

The code interfacing between Most and this is based on their [Most + React TodoMVC example](https://github.com/briancavalier/mostcore-todomvc/blob/master/src/index.js).  Why streams?  Because ... I felt like it.



## Async Content

As shown in their [documentation on content types](https://viperhtml.js.org/hyperhtml/documentation/?_sm_au_=iJVkjmLRRrNN23PR#essentials-8), they support Promises as a native content value, which means you can lazily load things right out of the box.  Create your own Async Component!  In fact, [Loading indication is already built in with the `placeholder` intent](https://viperhtml.js.org/hyperhtml/documentation/?_sm_au_=iJVkjmLRRrNN23PR#essentials-10).  This means error states are as simple as ``.catch(error => hyperHTML`<div class="error">Oh no!</div>`)``



## Thoughts

- Size of own app code before bundling: ~12k
- Size of app code after bundling, minification: 76k
- Size of zip of app code after minification: 24k

This is quite a bit bigger (about 3x) compared to the full bundle from, say, hyperapp.  However, to be fair, I also included the `most` stream library here, which probably added quite a bit, meaning _this isn't a very good size comparison_.  Something like Redux, which is just a few functions, might be smaller.


### Templates

I find the templates to be more readable than hypescript-style helper functions, but that may be due to being more used to HTML than said helper functions.  The extra bits of the helper function, the string quotes, etc, all make it a bit noisier.


### Immutable Data

hyperHTML's wire function doesn't work well with immutable data: It expects to be wired to an object and assumes an object with a different identity, even if given the same id argument, must necessarily lead to a different node.  This is perhaps to be expected given how it's stated to work, but never the less caught me off guard.

A way around this then is to use a Custom Element that can be cached per item to act as the fixed instance.  For now, I just used something that doesn't change over the lifetime of the app and use different id args to distinguish between actual items, but I don't think this is a good way to go about it.  Maybe just pass the item's id itself as the first arg?


### Imperative Updates

By which I mean things like "give this element focus".

I imagine this could be handled by some sort of formalized "Effects" handling system, by which a render update could trigger queue up some "effect" to run post-render.  Renders are, as far as I know, synchronous, excepting where Promises are used of course.

Then again, maybe I should just shove such things into Actions, and just make them taps; that is, they perform some side effect then return the state unmodified.  Either that or wrap any such things in a Web Component.
