TodoMVC Test - hyperapp
=======================

Implementing (most of) TodoMVC using the elmish-looking [hyperapp](https://github.com/jorgebucaran/hyperapp).  (NOTE: As of writing, this is using hyperapp V1 and V2 is under active development.)

As this is only ~1kb, in modern browsers this is very nice on the bandwidth budget.  Add to that a pure-functional-by-default mode of operation coupled with life-cycle hooks that operate on the element itself and you get a very tidy way to build UIs in a safety-first-but-still-pragmatic manner.  Not as friendly if you like class based components, but if you're fine treating data as just data, then this might be another fun framework to try.

Builds using Webpack because developers must download a minimum of butt tonnes of JS.  (And we know that code cannot lie.)
