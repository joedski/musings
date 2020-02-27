Journal 2020-02-27 - Batching External Calls and Marhsalling Operations
=======

Gosh, I don't even know where to start on this.  There's probably a bunch of things that already do this sort of thing that I don't even know about because I have no idea what to even look up.

Maybe as I start along and dig more into it, I'll come across things that point me in various directions, to various posts and papers to read.

My thought is that, currently when we want to make decisions based on remote data, we either make each call to the remote data as we need it, or we do some pre-work to determine what data we actually need before hand and make fewer calls for more data ahead of time, then make the decisions afterwards.

The main issue is that this nearly always results in mixing data retrieval with decision making, and means that the more performant way to do things can be sometimes quite different from the design specification we're trying to implement.

The issue with trying to move things around is that, often, any given parts of the process are dependent on previous parts of the process, since the point of prior steps is frequently to build the context required to execute those later steps.

One thought that comes to mind is that of dependency tracking: local operations and remote operations depend on prior operations, except for the initial-most operations which depend on nothing.  It seems then that you could define a lazy operation graph, the final operation (sink) being the return of some value (or throwing of some exception).  Mmmm graphs.

Another thought is you could learn Haskel, but very few corporations want to hire Haskellers.  That requires a special (read: expensive) kind of crazy.  Once you do that, everyone else approaching the codebase will come away babbling inchoately about monads and functors and have to be carted off to the funny farm.

Anyway.  The main commonality there is laziness: try to defer remote executions until you absolutely must make them so that, hopefully, you'll be able to get all the required data you need in one swell foop.  That's the idea, anyway.

But now I'm back at the problem of: where do I even start with this?  Well, abstract is hard and weird and my poor little brain can't really handle it starting out, so start with concrete examples.



## Trivial Example: Just a Single Entity

Let's say we just want to get a single entity by provided ID?

- Inputs:
    - Entity ID
- Process:
    - Select Entity from Entity Store where ID = Entity ID
    - Return Entity

That's about as simple as it gets.  Nothing much to say here, then.



## Trivial Example: Get Things Owned By Friends Of Entity

- Inputs:
    - Entity ID
- Process:
    - Select Entity as Friend from Entity Store where Friend Of ID = Entity ID
    - Select Thing from Thing Store where Owner ID = ID of Friend
    - Return Thing collection

Hm.  Not much else to say there.  That's two back-to-back queries, so that could actually be optimized down into one single one if you needed to.  The DB engine probably has a bunch of smarts already programmed into it to make such a query more optimal, too.



## What Am I Missing, Example Wise?

The thing which spawned this ponderance was a permissions type thing, but the permissions were predicated on quite a number of things.  Licensing, origin, etc.  I can't really just dump that process into this document, but I wonder if somethign close to it could be enough?

What else would be similarly complicated?  Copyrights?  Certainly with different nations having different copyright laws that would be complicated.

As for what it is generally that's actually necessary to build a sufficiently nasty thing to spawn these thoughts, I'm not sure exactly.  Something about prefetching data to make later queries easier, sure, but how do you construct something where that's necessary?  It might be because I'm thinking more in technical design rather than functional requirements that I'm not actually hitting my head against the wall I want to hit.
