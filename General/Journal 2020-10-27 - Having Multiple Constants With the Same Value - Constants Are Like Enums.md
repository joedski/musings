Journal 2020-10-27 - Having Multiple Constants With the Same Value - Constants Are Like Enums
========

> TL;DR: Doors and Sockets might both have an Open and a Close state, but Doors don't (usually) have a Pending state. (Both may also have a Blocked state, though.)  Groups may also be Open and Closed but those are entirely different meanings of those same words.

I strongly believe that absolute deduplication of magic values to 1 single constant is not itself useful where that constant is used in different semantic domains.

How to illustrate what I mean...

Suppose we have 2 enums, one used for the status of a pipe, and one used to describe general group access.

```
enum PipeStatus { closed, open };

enum GroupGeneralAccessType { private, open };
```

Entirely coincidentally, `PipeStatus.open` and `GroupGeneralAccessType.open` will be given the same integer value, usually 1.  However, we do not say that `PipeStatus.open` and `GroupGeneralAccessType.open` actually mean the same thing, their `open`s refer to two different things.

This is also why I advocate eagerly grouping constants.  They should be meaningfully grouped, rather than tossed into a single Constants bag, as that grouping tells any future devs the semantic domain those constants are meant to operate over; it tells people the purpose of these constants relative to their siblings.

Additionally, a single Constants bag will inevitably grow very large, making it all too easy for someone to miss some of the constants, which has a tendency to cause unintentional duplication.  Further, most constant bags I've seen do not have any sort of namespacing of those constants even by naming convention, which results in what is essentially the same "magic values" problem once removed.  What does `AppConstants.ADMIN` mean?  Who knows.  The lack of any sort of namespacing tells me nothing of the semantic domain or expected usage.  `AppConstants.UserRoleNames.ADMIN` tells me significantly more.
