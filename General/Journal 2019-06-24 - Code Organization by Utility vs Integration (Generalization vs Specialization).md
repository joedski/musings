Journal 2019-06-24 - Code Organization by Utility vs Integration (Generalization vs Specialization)
=========

As I've been thinking about it, one dimension that code should be organized by is on what I'll call here the Utility vs Integration dimension.

> There might be a more generally accepted name for this, and I'll try to remember to update this if I find out.

> This is not to be confused with the concept of Functional Core, Imperative Shell, though in my opinion separating Utilities from Integrations greatly helps with following the Functional Core, Imperative Shell methodology.

To summarize:

- Utilities are units of code that are general in some sense, either to the given Business Domain, or more generally across the given Application Architecture Domain.
    - One could think of Utilities as units of code that could be copy/pasted between code bases whose domains intersect.
    - They are the DRYing of your Repetitions, if you will.
- Integrations on the other hand are pieces of code that tie together and/or specialize one or more Utilities to achieve a single specific effect or end goal.
    - In contrast to Utilities, there's usually very little value to copy/pasting Integrations between code bases.
    - They are the parts you cannot DRY.

For a more modular code base, then, one should strive to separate as much code out into orthogonal Utilities as possible.
