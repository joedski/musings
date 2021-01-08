Journal 2021-01-06 - The Main Reason of the Moment Why Computed Props Are Better Than Data - Colocation of Definition with Declaration
========

Working on sometimes hideously large components (which really ought to be broken down...), I will say that this is probably the single biggest reason computed props are better than data props:

With computed props, you see the whole definition of that prop at its declaration.  Everything that affects the value of that computed prop is referenced right there.  With data props, the declaration is just the declaration, you don't see what all affects the value there.  Rather, all that is spread across the component.

This makes data props more difficult to keep track of mentally, and more difficult  or at least more tedious to extract when trying to break a component into smaller sub components.
