TodoMVC Test - htmlHTML
=======================

This view render lib has automatic bonus points due to having "Hyper" in the name not just once, but _twice_, which means it's at least twice as good as normalHTML.  Apparently some people think that's stupid, but they're themselves just too stupid to understand that more hyper is more better.

Okay, but seriously, [hyperHTML](https://viperhtml.js.org/hyperhtml/documentation) is pretty slick looking: It takes advantage of specification/implementation details of ES6 Tagged Template Literals to create something that looks as intuitive string interpolation but runs performant DOM updates.  It doesn't track a VDOM, and thus doesn't incur the memory footprint that comes with that.  Allegedly, it is the fastest, thus the 2x Hyper.  Let's just rename it H<sup>Two</sup>ML because it's winning.

Aside: I also worked on learning Webpack 4 and Webpack Dev Server setup here, so mlep.



## Async Content

As shown in their [documentation on content types](https://viperhtml.js.org/hyperhtml/documentation/?_sm_au_=iJVkjmLRRrNN23PR#essentials-8), they support Promises as a native content value, which means you can lazily load things right out of the box.  Create your own Async Component!  In fact, [Loading indication is already built in with the `placeholder` intent](https://viperhtml.js.org/hyperhtml/documentation/?_sm_au_=iJVkjmLRRrNN23PR#essentials-10).  This means error states are as simple as ``.catch(error => hyperHTML`<div class="error">Oh no!</div>`)``
