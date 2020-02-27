Journal 2020-02-27 - Separation of Definition and Execution
==========

Something that seems to come up when dealing with many forms of library abstraction is the separation of definition and execution.

Other ways to say this are:

- Configuration and Execution
- Parameters and Calls

It all boils down to the same thing: You're creating your parameters, your description of what you want to do, and operating on that, and only later are you actually executing it.

Such parameters can be anything your language can handle, and need not be serializable, so functions/lambdas, instances, whatever.  The main point is the idea of creating your parameter set as its own value and operating on that prior to actual execution.

One such example of something that follows this pattern dogmatically is a library like [Redux.js](https://redux.js.org/), a library so simple that you can use it (with some babel magic) in IE8.  At least, awhile back it was, not sure if it still is.

You don't mutate state, you dispatch Actions, which are descriptions of intent, and Redux itself executes upon those Actions.  Sometimes Middleware handle the actual execution, such as for simple request bindings, and sometimes Reducers handle the actual execution by creating a new state tree.



## Why Is This Useful?

I think there are a great many reasons it's useful.

- You can define operators that create or transform your definitions before you actually execute on them.
- Remove the actual execution to somewhere else over there, letting you more freely add/remove features.
- You can create new abstractions and compositions, using descriptions as parts of other descriptions.  For example, "subscribe to request", or "debounced request".
