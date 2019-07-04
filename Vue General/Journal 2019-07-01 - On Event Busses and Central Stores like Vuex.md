---
tags:
    - event-bus
    - vue
    - vue:vuex
summary: >-
    Thinking about how the Event Bus and Vuex interact, if at all, and what domains they cover, and how such a pattern applies if at all to FRP or strictly-Redux-like setups.
---

Journal 2019-07-01 - On Event Busses and Central Stores like Vuex
========

I've already [sketched out an implementation previously](./Event%20Bus%20and%20Bus%20Events.md), so won't concern myself with that here.

Instead, I want to think about how the Event Bus pattern fits together or covers different ground from the Central Store pattern.

In short, I think my initial thoughts are best summarized like this:

- The Central Store keeps State consistent and defines global Actions that can be triggered by Events.
- The Event Bus provides a way for Components to notify everyone that A Thing Has Happened.  It could also be seen as a way to notify globally about some User-(or-other)-Generated Event.

Theoretically, Event Bus Events and Store Actions are the same thing, or at least somewhat close: Something happened and the global state needs to update.  The difference is, I think, in the coupling of code units.

- The Central Store usually defines all Actions because they are globally available.
- The Event Bus on the other hand only defines global Events, not the reactions to those Events.



## On Vuex Actions vs Global Event Busses

A special consideration should be given for how Vuex actually handles Actions: They're basically treated the same as a Custom Event on a Vue Component, in that any _Un-Namespaced_ Vuex Module which defines an Action of a given name is actually defining an Action Handler for that Action Name which handles a given Payload.

This behavior is [explicitly stated in the docs](https://vuex.vuejs.org/guide/actions.html).  To quote:

> It's possible for a store.dispatch to trigger multiple action handlers in different modules. In such a case the returned value will be a Promise that resolves when all triggered handlers have been resolved.

The way this is behavior is avoided is to [namespace the modules](https://vuex.vuejs.org/guide/modules.html#namespacing).  Well, that's the more foolproof way; the other way is to just give everything you want to be specific to a given module a globally-unique name.

> Aside: The above is also probably why it's common to treat Actions as returning nothing: The return value actually changes depending on if there's only one handler or many handlers for one Action name!



## On Using Vuex As the Event Bus via Actions

I think the way to do this goes back to the division of the codebase into [Generalizations and Specializations](../General/Journal%202019-06-24%20-%20Code%20Organization%20by%20Utility%20vs%20Integration%20%28Generalization%20vs%20Specialization%29.md):

- All the orthogonal Generalized behavior is separated into namespaced Vuex Modules.
- All the Specialized behavior is put into un-namespaced Vuex Modules.

This allows multiple Specialized modules to react to a given Action Name, but requires making all such actions globally unique.  It seems a bit paradoxical that the Generalizations/Orthogonalities/Utilities are given specific namespaces while the Specializations/Specific-Integrations are not namespaced, but the consideration is really this:

- The Generalizations/Orthogonalities/Utilities are each meant to stick to their own modules, and effort should be put into making sure they don't interfere.
- The Specializations/Integrations on the other hand are things specific to our Application, and as such all the modules that categorize Specialization/Integration Behavior should live in the same namespace, even if the modules themselves are separate code units.
    - This is because each one may have different behaviors and different local state around the same Actions.

> Aside: This is also where something like Typesafe Vuex kind of falls apart by imposing its own restrictions on how to interact with Vuex: It defines Actions to be tied specifically to one module only, but Vuex doesn't impose any such restriction.  Add to that the mildly surprising return type thing... you can't trust the return value, outside of it being a Promise.  `Promise<unknown>` would be the correct return type.

Of course, one could namespace the App Vuex Store Module, then just _not_ namespace the submodules of that.  That's probably the way to go, there.  Either way, the end result is a loose coupling between Actions and Handlings, which is ultimately what we wanted by using the Event Bus pattern.

If this sounds even vaguely familiar, it's because it's a good way to organize Application State in the _View (Vue?) as Function of State_ architecture, or the only way to organize state in a pure-functional approach.
