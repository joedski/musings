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

As much as I don't like classes because functions are just so superior in all the ways like I can't even tell you how because, we could rewrite the above into a class based form, in which case it'd be largely the same, but with `inst` replaced with `this`.

Still, the main point is this: We end up with our app state as a tree of components, and we just so happen to wire different templates to them.

For small apps, this is perfectly fine to do all manually, as can be seen above.  For larger apps, however, things start to get a bit hairy.  However, even while state updates are manual, as are redraws in reaction to those updates, the way I wrote them is very regular.

> Aside: The representation of the app state as a model object is maybe why a View Model is called a View Model, we're creating a Model of our View, usually from the Model of our Domain.

So, the trick is taking those regularities and extracting them out into nice easy to use patterns.  Part of that is done, in a few different flavors, by [the various component prefabs](https://viperhtml.js.org/hyperhtml/documentation/#components) included with HyperHTML itself.
