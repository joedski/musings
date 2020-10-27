Journal 2020-08-19 - Naming Variables - Why Do We Care About This Variable and How Is It Relevant?
========

Everyone's heard about the dreaded Hungarian Notation, and how terrible it is and how it will devour your children and all that.  Not as many talk about [how the Hungarian Notation everyone knows about isn't even Hungarian Notation as originally described](https://www.joelonsoftware.com/2005/05/11/making-wrong-code-look-wrong/).  Even I didn't know about this.

A guiding principle for naming things that I've found good to follow is: Why do we care about this variable?  Why are we bothering to allocate memory, computer and mental, and name it?  How is it relevant to the current context, and distinguished from other things in the current context?

In the example given by Joel, there's a very relevant why for the Unsafe vs Safe strings, and that's that we can trust Safe ones because we've validated them.  It's a constant reminder that we're dealing with unsafe-vs-safe values, and that we can do certain things with some of these variables but not others.

That along with good method/function names will go very far creating code that is actually self documenting.  Good naming will make your code significantly more readable, as it constantly reminds the developer just what's important in the current context and why.  This means comments can further be avoided until you get to things like explaining strange implementation decisions.

> Regarding safe strings specifically: Certain type systems (Mostly those in ML languages) allow definition of tagged types which could allow semantic encoding at the type level basically free of charge.  Provided the language compiler can optimize it, anyawy.  You'd have to write all your API in terms of your SafeString box type, but that's explicit and that's good.  Doesn't negate the need for good naming, just adds that additional layer operational safety, and this example only applies to this specific case.

Other examples of what Joel called "Application Hungarian Notation":

- `rel...` vs `abs...` vs `win...`
- `prev...` vs `current...` vs `next...`
- ... some others I'm sure I've done through out the ages.




Having Multiple Constants With the Same Value - Constants Are Like Enums
========

I strongly believe that absolute deduplication of magic values to 1 single constant is not itself useful where that constant is used in different semantic domains.

How to illustrate what I mean...

Suppose we have 2 enums, one used for the status of a pipe, and one used to describe general group access.

```
enum PipeStatus { closed, open };

enum GroupGeneralAccessType { private, open };
```

Entirely coincidentally, `PipeStatus.open` and `GroupGeneralAccessType.open` will be given the same integer value, usually 1.  However, we do not say that `PipeStatus.open` and `GroupGeneralAccessType.open` actually mean the same thing, their `open`s refer to two different things.

This is also why I advocate eagerly grouping constants.  They should be meaningfully grouped, rather than tossed into a single Constants bag, as that grouping tells any future devs the semantic domain those constants are meant to operate over; it tells people the purpose of these constants relative to their siblings.  Additionally, a single Constants bag will inevitably grow very large, making it all too easy for someone to miss some of the constants, which has a tendency to cause unintentional duplication.
