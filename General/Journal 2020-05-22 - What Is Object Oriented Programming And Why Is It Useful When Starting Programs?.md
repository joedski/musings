Journal 2020-05-22 - What Is Object Oriented Programming And Why Is It Useful When Starting Programs?
========

The short definition usually goes something like "encapsulation of business behaviors/logic into things called Objects while hiding the backing data (source)".

What the hell is that even.

The ideas seem reasonable, if we break it down:

- Encapsulation of business behavior/logic, that's just breaking our problem into more digestible units, something we all learn one way or another in our programming careers.
- Hiding the backing data/data source, that's a bit harder to define.  Why do we want to hide the data?  Isn't data what all we deal with?  Isn't programming basically just data and manipulation of it?

This second point and its questions are something I grappled with for a bit, but as so often happens my unconscious mind connected some things in the shower: this hiding of data means the exact implementation of that manipulation is hidden, and while that's exactly what it says on the tin, it's also the great strength everyone keeps shouting about.

One reason, the one I realized, is this: It lets you write the interface first, blat out a crappy implementation to get it working, then refactor it with no one the wiser.  Basically a higher level version of the whole "make it work then make it work well" thing.



## A Practical Example

Awhile back, I made a graph-based branching narrative progress tracker, that let you compute a consistent progress value for every node in the narrative graph.  It allowed for multiple entry points and multiple exit points, and was really pretty neat.

But I spent way too much time going back and forth about what would be the most efficient way to actually organize the data, especially in the face of all the random graph manipulation libraries people have put up on npm.

What I should've done was this:

- Determine what _behaviors_ my progress thingy needed, then create the interface to supply those behaviors.
- Go with the first implementation that worked, then once it works (I wrote unit tests, didn't I?  No?  Oh.  Well, there's my problem...) analyze if it can be done better, and if it actually needs to be done better.

To the latter-most point, efficiency isn't actually that much of a concern for graphs under a thousand some nodes, because it's a one-time computation and after that, all you need is just the progress value.

I'll tell you what I didn't do in the actual library, though, and that's the whole encapsulation/data hiding thing.

Instead, I just returned the raw data which, while it's okay, it meant that any change to the raw data changed the interface that any other part of the program dealt with, meaning there was a tight coupling between the _internals_ of my library and any users of that library.  That's bad, because it means users of the library have to change how they use the library any time the library itself changes.

Usually that results in users of the library writing their own interface to the library, something the library itself should have done in the first place.

It also would've made use of disparate graph libraries easier, because if they expected different ways of storing a graph data structure, I can just translate between them with getters and setters and so everyone is happy.



## What About Functional Programming?

What about it?

What's the difference between an opaque object with a public interface and a monad with public operators?

I mean, just about everything, but also consider: A Sequence Monad could be implemented using any number of data-sequence methodologies, such as arrays, linked lists, or whatever else.  Seems similar to how Lists in Java or C++ might have a variety of specific implementations you can pick from to best suit the given need, but still all follow a List interface to allow various functions (operators) to manipulate or otherwise use that sequential data.
