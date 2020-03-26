Journal 2020-03-25 - A Better Confirmation Modal Modality
========

I think the main reason I learn words is to write stupid titles.

What is a confirmation modal?  ~~A miserable pile of~~ A temporary box that pops up and asks if you really want to do that thing?  Like, do you reeeeally want to do it?  Really, really want to do it?

If the user clicks the confirm button, the thing is done.  If they click the cancel button, the thing is not done.

The first complication to that I can think of is: when the confirmation modal is also treated as the progress indicator, it must stay up.

One could argue that is bad practice since it means there's less visual indication of a state change, but anyway.

So, in summary:

1. User initiates some action.
2. Confirmation modal is opened, present the user with two options: confirm, cancel.
    1. User selects cancel: the modal is closed, nothing happens.
    2. User selects confirm: the action occurs.
3. If the modal handles progress for the action, then:
    1. The modal switches to in-progress mode when the action starts.
    2. When the action completes, the modal switches to action-complete mode.
4. An end state is shown based on whether the action completed successfully or not:
    - If the action completed successfully, the user is shown a confirmation of this.
    - If the action completed unsuccessfully, the user is shown a confirmation of this, possibly with the option to retry.

We can change around the exact UX to match our app, but we'll go with this flow for this breakdown.

We've got a few things actually necessary to implement this, then:

- State:
    - Modal is open.
    - Action progress.
- Events:
    - User selected confirm (or retry).
    - User selected cancel.

Action Progress is actually super easy to represent: an AsyncData value will work perfectly, because it encapsulates all of the states of the action: NotAsked, Waiting, Error, and Data (Success).  Modal is Open can be an optionally-controlled thing to enable dual-use in Vue as either a stand-alone item or an item activated by a single button.

That is:

```html
<template>
    <confirmation-modal
        class="modal--controlled"
        :show="isModalShown"
        :async-data="actionData"
        @confirm="doAction"
        @cancel="isModalShown = false"
    >
        <template v-slot:message="{ isWaiting }">
            <p>Are you actually really truly ready for the action?</p>
        </template>
    </confirmation-modal>
    <button>Action!</button>
</template>
```

Vs:

```html
<template>
    <confirmation-modal
        class="modal--semi-autonomous"
        :async-data="actionData"
        @confirm="doAction"
    >
        <template v-slot:activator="{ on }">
            <button v-on="on">Action!</button>
        </template>
        <template v-slot:message="{ isWaiting }">
            <p>Are you actually really truly ready for the action?</p>
        </template>
    </confirmation-modal>
</template>
```

Hm.  That still requires tracking of `actionData` on the parent, and somehow mapping `doAction` to that.  Now, with a Requests Module and a plain request that's not so hard.  What about multi-step things, though?



## A More Vue Friendly Generalization Around Async Actions

AsyncData is generally useful representing the synchronous state of any single one-off action.  Well, okay, you can always reset the action, but still, you start it off, then it does its thing, then stops.  Resetting is basically the same then as just creating a new instance.

Not much is really needed for this, then.

```typescript
interface AsyncAction<
    TArgs extends any[],
    TData = unknown,
    TError = unknown
> {
    (...args: TArgs): Promise<TData>;
    reset(): void;
    readonly data: AsyncData<TData, TError>;
}

interface RefreshableAction<
    TArgs extends any[],
    TData = unknown,
    TError = unknown
> extends AsyncAction<TArgs, TData, TError> {
    readonly refreshableData: RefreshableData<TData, TError>;
}
```

Which means you can create one with a simple factory function:

```js
function createAsyncAction(action) {
    const name = `AsyncAction(${action.name})`;
    let promise = null;
    const state = Vue.observable({
        data: AsyncData.NotAsked(),
    });
    const wrappedAction = {[name](...args) {
        if (promise != null) return promise;

        promise = action(...args).then(
            data => {
                state.data = AsyncData.Data(data);
                promise = null;
            },
            error => {
                state.data = AsyncData.Error(error);
                promise = null;
            }
        );

        state.data = AsyncData.Waiting();

        return promise;
    }}[name];
    Object.defineProperty(wrappedAction, 'reset', {
        value: function reset() {
            state.data = AsyncData.NotAsked();
        },
        writable: false,
    });
    Object.defineProperty(wrappedAction, 'data', {
        get() {
            return state.data;
        },
    });
    return wrappedAction;
}
```

Not sure how I feel about enforcing promise mutexing here, but it's the only simple way to keep it from stomping on the previous state.  The other option is to return a separate observable each time, so that you still have one unique thing to associate the given state changes to.  In that sense then, if you mutexed on that observable, the end result would be no different.  And, if you did that mutexing in the controller that was using the async action, then you'd be back to manual state tracking which is what this whole async action thing was meant to reduce.
