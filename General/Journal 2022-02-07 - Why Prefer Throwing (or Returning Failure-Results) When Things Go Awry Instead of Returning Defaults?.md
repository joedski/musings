Journal 2022-02-07 - Why Prefer Throwing (or Returning Failure-Results) When Things Go Awry Instead of Returning Defaults?
==========================================================================================================================

Why do I think it's better to just throw in exceptional cases than to return defaults, when it comes to library code?

In short: the principle of least surprise.

> Note: this could also be handled by creating a well defined result type of some sort, or a data type that forces consumers to handle all possible cases. (ADT/Tagged Sum)

Returning some default assumes that default is always what the parent wants, rather than being able to determine if it's appropriate to use a default or to pass some exception upwards.  When the child context returns some default, I think that creates an additional assumption about the parent, rather than throwing an appropriate exception and letting the parent decide what to do.

Granted, not always possible because SonarQube is angry, but by eagerly throwing we allow the parent to decide how to handle the exception or even if it does.  This makes it more composable.

This comes back to the principle of "Don't assume a specific parent context from the given child context, prefer each child context is simple and not too clever."

Or, I suppose, the princple of least surprise, but that depends on an already known definition of "least surprise".

> One thing to note about either of the suggested strategies, either throwing well defined exceptions or defining a result data type of some sort that defines all the cases, is that either one tells callers what to expect behavior wise: Such and So could fail, and here's how it could fail!
> 
> A side benefit is that it means the child context does not need to think about what to do in every parent context, it just throws and "what to do about that" becomes the parent context's problem.  This leaves different parent contexts free to handle that problem as appropriate to their specific cases.
> 
> This leads to parent contexts being more specific (well, as specific as before) while allowing child contexts to become more generic and thus more reusable.  This is especially important when encoding business rules or writing library code.
