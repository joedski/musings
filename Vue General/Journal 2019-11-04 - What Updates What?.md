Journal 2019-11-04 - What Updates What?
========

I seem to be getting more reactivity updates than I expect, even of values that are primitive such as numbers or null.

At least with regards to Computed Properties, I'm guessing then that no actual checking is done to see if the previous value is the same as the next, on the basis that that could swallow deep-object updates.  Dunno.  I could understand that, though.  What I don't understand is a primitive value causing a recomputation of subsequent computed props.

Hm.  I think I need to poke things a bit more, if for no other reason than to correct misconceptualizations.

Some things I am dealing with, places to start:

- State that has objects-as-key-value-maps, whose values are themselves objects of various sorts.
- Computed Properties that access a value in one of those keyed-values.

Sequence of events that seems to be inducing unexpected behavior:

1. ... TK!
