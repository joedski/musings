Journal 2021-01-04 - What is a Class, Anyway?
========

Nothing deep (yet), just idle musing.

A class, at least in Java, is just a way of passing around a shared context for a certain collection of methods to operate upon.

- This context might contain hidden bindings to a data backend.
- This context might contain internal state that the methods interact with and selectively expose.

The same could be said of module functions that operate upon an otherwise-opaque module data type, in certain other more FP oriented languagues.

Anyway, I really just wanted to note this probably incorrect thought down: looking at classes like this, as a context that certain functions operate upon, a violation of the Single Responsibility Principle is in part a narrowly scoped violation of the rule of thumb about avoiding global variables.  I say "probably incorrect", though, as it's not really related, but the neurons fired so eh.
