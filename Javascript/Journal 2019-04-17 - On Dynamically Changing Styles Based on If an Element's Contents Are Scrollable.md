Journal 2019-04-17 - On Dynamically Changing Styles Based on If an Element's Contents Are Scrollable
====================================================================================================

While not an unusual phenomenon, I thought I'd document my thought process here.

Essentially, this is performing an action when ever the answer to the simplest question changes: "Does the height of the contents exceed the height of the container?"  (Or width, if scrolling horizontally)

The other question that I'm not answering (yet?) is: "Which end if any are the contents scrolled to?"



## Initial Thought

There are two pieces of state to track:

- Available Height of the Container
- Height of the Contents

The Available Height of the Container is itself able to be determined exactly after a paint.  In cases of small numbers of items, the Actual Height of the Contents can be calculated, but in cases where you need to do something like virtual scrolling, all you really need to know is if the Height of the Contents is larger than the Available Height or not, because that's all the question is asking.

You then update those two state values on Animation Frame, which then lets you update the derived state that is the answer to the above question.

Not sure there's any more to worry about than that.


### On Generalization

It seems like it should be pretty simple, actually, to generalize this, at least somewhat:

- We care about if the bottom of the Contents matches with the bottom of the Contents Container in absolute coordinates.
- The same for the tops thereof.
- And for the left and right sides, if doing horizontal scrolling.

From there, we can easily implement either "Are contents scrollable period" or "Are contents at either end" checks.


### On Efficient Implementation, With Example in Vue

In full, there are a few things we need to consider ancillary to the above tracking:

- Throttling calls and therefore updates to/with RAF
- Cleaning up any pending call

> TBD!
