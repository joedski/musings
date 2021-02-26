Journal 2021-02-18 - Why the Composition API Is Superior to Component Options
========

The Composition API is concerned with how each part of the internal processing within a component works.  Is A derived from B and C, and in turn consumed by D?

The Component Options API is concerned with what each part of the internal processing within a component is.  Is A a component prop, a computed prop, a data value?

A related comparison is between so-called Application Hungarian Notation and and so-called System Hungarian Notation:

- Application Hungarian Notation is concerned with naming variables according to their purpose in the current scope and context.
    - Variables are thus named to make it easier to determine how they relate to other things in the current scope and context.
    - This style of variable naming is naturally rederived by anyone who cares about self-documenting code, it's just not frequently called (Application) Hungarian Notation, but probably some other more bland term like "semantic naming" or whatever.  That's what I'd call it, anyway, and I do love dry technical naming with big words.
- System Hungarian Notation is concerned with naming variables according to their data type.
    - Variables are thus named according to what they are, and less concern is given to how they relate to things around them.
    - This style of variable naming is very much reviled, and rightly so: it is useless noise outside of extremely niche cases.

It's noted in the initial presentation on one reason why the Composition API is being created, besides supporting actual composition without bloating the rendered component hierarchy: colocating the constiuent parts of each chunk of logic.

With the Component Options API, you can't do this as each chunk of logic must be placed according to its type (component prop, computed prop, data value, etc), not according to what it's actually concerned with functionality wise.  This makes navigating large components with complex behaviors rather difficult, and makes extracting logic for reuse or componentization more tedious.
