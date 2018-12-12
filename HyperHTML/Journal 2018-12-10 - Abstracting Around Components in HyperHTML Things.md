Abrstracting Around Components in HyperHTML Things
==================================================

So, if I'm trying to consider the case of dynamic children, let's go with, say, a danymic list of counters.

```js
function getOption(optionName, defaultValue, options) {
    return (optionName in options ? options[optionName] : defaultValue)
}

function Counter(state) {
    return hyperHTML.wire(state)`
    <div class="counter">
        <div class="counter-value">${state.value}</div>
        <div class="counter-controls">
            <button data-action="increment" onclick=${state}>Incr</button>
        </div>
    </div>
    `
}

Counter.createState = function createState(options = {}) {
    const state = {
        value: getOption('value', 1, options),
        increment: getOption('increment', 1, options),

        handleEvent(event) {
            state[`on${event.type}`](event)
            Counter(state)
        },
        onclick(event) {
            const { action } = event.target.dataset
            switch (action) {
                case 'increment':
                state.value += state.increment
                break;

                default: break;
            }
        },
    }
    return state
}

function App(rootEl) {
    const state = {
        // :: Array<{ value: number, increment: number, handleEvent: (Event) => void }>
        counters: [],

        handleEvent(event) {
            state[`on${event.type}`](event)
            // kinda mithril 0.x esque.
            render()
        },
        onclick(event) {
            const { action } = event.target.dataset
            switch (action) {
                case 'add-counter':
                state.counters.push(Counter.createState())
                break;

                case 'remove-counter':
                // Just remove the last one.
                state.counters.pop()
                break;

                default: break;
            }
        },
    }

    const html = hyperHTML.bind(rootEl)

    function render() {
        return html`
        <h1>Counters!</h1>
        <div class="counters">
            ${state.counters.map(Counter)}
        </div>
        <button data-action="add-counter" onclick=${state}>Add Counter</button>
        `
    }

    render.state = state

    return render
}

window.render = App(document.getElementById('app'))
render()
```

Hm.  This basically turns `state` into a component tree, actually.

We have a component which looks like this:

```js
function Counter(inst) {
    const html = hyperHTML.wire(inst)
    return html`
    <div class="counter">
        <span class="counter-value">${inst.state.value}</span>
        <button data-action="increment" onclick="${inst}">Incr</button>
    </div>
    `
}

Counter.create = function Counter$create({
    value = 1,
    increment = 1,
} = {}) {
    const inst = {
        state: {
            value,
            increment,
        },

        handleEvent(event) {
            inst[`on${event.type}`](event)
            Counter(inst)
        },
        onclick(event) {
            const { action } = event.target.dataset
            switch (action) {
                case 'increment':
                inst.state.value += 1
                break;

                default: break;
            }
        },
    }

    return inst
}
```

Actually, two components.  The second one, which is hidden, looks like this:

```js
function App(inst) {
    const html = hyperHTML.wire(inst)
    return html`
        <h1>Counters!</h1>
        <div class="counters">
            ${inst.state.counters.map(Counter)}
        </div>
        <button data-action="add-counter" onclick=${state}>Add Counter</button>
    `
}

App.creatae = function App$create({
    // :: Array<{ value: number, increment: number, handleEvent: (Event) => void }>
    counters = [],
} = {}) {
    const inst = {
        state: {
            counters,
        },

        handleEvent(event) {
            inst[`on${event.type}`](event)
            // kinda mithril 0.x esque.
            App(inst)
        },
        onclick(event) {
            const { action } = event.target.dataset
            switch (action) {
                case 'add-counter':
                inst.state.counters.push(Counter.create())
                break;

                case 'remove-counter':
                // Just remove the last one.
                // When it's removed, it eventually gets collected,
                // and thus falls out as a weakmap key,
                // putting the value itself also up for collection.
                inst.state.counters.pop()
                break;

                default: break;
            }
        },
    }

    return inst
}
```

And a top-level render that looks like this:

```js
function createApp(rootEl, rootInst = App.create()) {
    const html = hyperHTML.bind(rootEl)
    function render() {
        return html`${App(rootInst)}`
    }
    render.rootInst = rootInst
    render.rootEl = rootEl
    return render
}
```

This results in a state tree `rootInst` that looks something like this after some play:

```js
rootInst = {
    state: {
        counters: [
            {
                state: {
                    value: 1,
                    increment: 1,
                },

                handleEvent(event) {},
                // ...
            },
            {
                state: {
                    value: 5,
                    increment: 1,
                },

                handleEvent(event) {},
                // ...
            },
        ],
    },

    handleEvent(event) {},
    // ...
}
```

Put another way,

- App:
    - other stuff
    - state:
        - counters: array of...
            - Counter:
                - other stuff
                - state: value, increment
            - Counter:
                - other stuff
                - state: value, increment
            - ... etc

Amusingly, as dirty as that may look, it's actually a Top Level State Atom approach, just with Children and Data combined into one.

As much as I don't like classes because functions are just so superior in all the ways like I can't even tell you how because, we could rewrite the above into a class based form, in which case it'd be largely the same, but with `inst` replaced with `this`.

Still, the main point is this: We end up with our app state as a tree of components, and we just so happen to wire different templates to them.  If we can automate management of this tree of components, we're good.



## Abstraction

For small apps, this is perfectly fine to do all manually, as can be seen above.  For larger apps, however, things start to get a bit hairy.  However, even while state updates are manual, as are redraws in reaction to those updates, the way I wrote them is very regular.

> Aside: The representation of the app state as a model object is maybe why a View Model is called a View Model, we're creating a Model of our View, usually from the Model of our Domain.

So, the trick is taking those regularities and extracting them out into nice easy to use patterns.  Part of that is done, in a few different flavors, by [the various component prefabs](https://viperhtml.js.org/hyperhtml/documentation/#components) included with HyperHTML itself.

Well, that's part of it, anyway.  The other part is, of course, data reconciliation.  How do we handle our data?  Direct mutation like above?  Immutably handled data like Redux?  ImmutableJS?  Mobx?  Cerebral?  Streams like Flyd?

This is important because we still need some way to map model values to view model values.

Now, HyperHTML has some niceties going for it in this regard:
- The same Template String behavior that HyperHTML itself is built around can also be used by any wiring we develop.
- The `wire` function itself keeps track of actual rendering functions per objects and optionally ids.
- We don't necessarily need to map Domain Model Values strongly to View Model Values, rather we could build machinery to help facilitate that mapping for us.

I think the View Model can basically be conceived of as a recursive tree of Components and their Children, where each each Child is itself a tree of Components and their Children with that Child as the Local Root.  The Global Root is the top level Component associated with the Mount Point, so it may be better thought of as the Mount Point Root since it may technically not be the only Mount Point.

So I just need to track those things:
- Mount Point
- Mount Point Root Component
- Local Root Component (aka Current Component)
- Parent Component of Local Root Component
- Child Components of Local Root Component (aka just Child Components)

The most important to keep track of I think is the _Child Components of Local Root Component_.  Other things are just book keeping on top of that.


### Tracking Children

We can't really do much about DOM nodes themselves, so we don't care about those.  We just assume they're being inserted directly and defer that to HyperHTML.  The things we will care about are going to be Components, however I'll chose to represent those here.

The simplest is probably a function that accepts whatever arguments the parent needs to feed it, but we still need additional information, such as the Template String Stuff, the current values, etc.  This could be a function with stuff attached or an object with the function attached.  Either way is about the same, honestly, so which ever is lighter weight is better.

As far as Keyed versus Unkeyed goes, Unkeyed is equivalent to Keyed where the Key defaults to the Index, so eh.


### On Children and State

In [the first example](./Abrstracting%20Around%20Components%20in%20HyperHTML%20Things%20(Files)/000-basic-components.html), I basically had Children sitting in the State, same as Data.  Do I want to separate those two things, here?  I probably should, but will it be easy?  Something to consider, certainly.

It would mirror other things like React, where the Render pass generates VNodes that represent what they're going to be, and that's reconciled with the current Tree which actually holds Instances.  Component definitions are almost just various funny ways of writing visitors.


### Context

I think having a Context API neatly solves groundwork for a great many different APIs, so it's something I want to include from the get go.  This can be used for everything from tracking parent nodes to injecting global state management, whatever.

I'm not sure about the performance implications, but my first try I'll probably just abuse the prototype chain.  It'll be fine, nothing 'll go wrong.  Hah hah.  Hah.


### Events

I like the Event Handler thingy, and want to retain that, but having to manually switch in each event handler is super annoying.  Can't we just do this with selectors or something?  At the very least, I could build an abstraction around `dataset`...

Turns out [`Element#matches(sel)`](https://developer.mozilla.org/en-US/docs/Web/API/Element/matches) is supported by even IE9.  That's more than good enough for me.  I can then just specify event handlers as `'onclick [action=increment]'(event) { ... }`, etc.  Still slightly awkward that we have to both specify a selector and reference some object, even `this`, in the render function, though.  Also possibly confusing that we're passing `this` as the event handler, but it's very performant at least.


### Hooks?

React Hooks are as of writing (2018-12-11) the New Hotness.  Support for that kind of API could probably be made, I'd have to think about it, but it's not a focus right now.  It would allow for a more function-centric style, though, which would make me somewhat happy, as well as explicitly stating opt-in to whatever features are so hooked.


### Whack at This?

So, can I write a longhand form of a thing which:
- Deals with a Component Instance Tree
    - Reconciles render updates with the current Instances
        - Creates and drops Instances as needed
- Allows Component Definitions to specify interaction with the Instance Data
- Deals with a Context
    - Creates the Context for each Instance
    - Passes this Context to each Child Instance of an Instance

My own component model then will have some ... things.
- Component Definition (type, basically)
- Context from Parent (if any, may be null)
- Context for Children
- Children Instances (How's this managed...? Probably by template interpolation position)
- Template Strings
- Raw Template Interpolation Values (the ones the component's render function returns)
- Processed Template Interpolation Values (all component stand-ins replaced with content renderable by HyperHTML)

The render process itself deals with a few steps, then:
- Render Local Root
    - Render Template + Children
        - This yields Primitives, DOM Nodes, and Component VNodes.
    - Reconcile Children with previous Children Instances
        - Apply changes to the instances based on the difference between the previous and next Component VNodes.
- Flush Local Root Changes to DOM
    - Render Children Instances to DOM Mutations

I kind of want to preserve the local-render-ability-ness of HyperHTML, though.  Are these two steps necessarily separate?  Or can they be run both at once, more or less?  Does one way or the other make sense or no sense?

Keeping them combined might be the only way it actually does make sense, at least in as much as calling `this.html` on a template actually triggers a redraw.  Hm.
