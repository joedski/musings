Journal 2021-02-09 - General Approach to Optionally-Controlled Components with Internal State
================

I keep running into this issue when building or wrapping components and component compounds in my work, so I thought I'd try to suss out a good general approach to start with before any complications occur.

Naturally, things have to adapt as necessary, but I'm hoping this should be a good starting point.



## First Thought: Reactive Accessors, "As Within, So Without"

- A stateful component should render from its own state, not the optionally-controlling props.
- The optional props should cause updates to the state via watches, but are otherwise mostly ignored.
- Updates coming from the template should update state only through reactive computed props (computed props that define both a getter and a setter), and the setter should emit an update event for the according controlling prop.

Naturally, this maps most cleanly to cases where an externally facing controlling prop corresponds exactly to a given internal state prop.

This helps by starting first with the component's own control, which is necessary to drive the internal interactions, then adding the external controllability on top of that in a separable and removable way.

I suppose in a way, it's a reflection of the Reactive State Accessor that sits between inner components and the state.

- For inner components:
    - State is accessed by an inner component through the Reactive State Getter.
    - Updates are written back to the State by the inner component through the Reactive State Setter.
- For parent/outer components:
    - State is accessed through an Event.
    - State is updated through a Prop. (via a Watch on that Prop)



## Second Thought: Always Defer to External Signals


