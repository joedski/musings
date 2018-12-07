(Sorta) Initial Learning
========================

I'd tooled around with [HyperHTML](https://github.com/WebReflection/hyperHTML) (the most hyper of web rendering libraries) a bit in the past, but really need to dig into it to figure out how to effectively use it.



## Prior Knowledge

So, I know this much:
- `bind(el)` accepts an element and renders the specified template to it as its contents.
- `wire()` creates a render function bound to itself (technically, bound to an internally created Object, but anyway) that accepts a template and returns HTML nodes.
- `wire(obj)` does the same thing as above, but has an explicitly provided object.
    - Effectively, `wire()` is the same as calling `wire({})`, that is, with an empty object literal.
- If you call `wire(obj)` a second time with the same object reference as before, `wire` pulls the HTML nodes previously associated with that object.
    - That is, when you call `wire(obj)` where `wire` has been passed the same `obj` in a prior call, it will look up the nodes associated with `obj` and deal with those instead of creating new nodes.
        - Note that it must be an Object or other non-primitive type (so, basically, an Object...) because WeakMap is used under the hood.
- In either case, when you then apply that `wire()`ed function to a template the first time, you get new HTML nodes.  The second time you apply it to the same template, you get patching behavior.
    - If you call the function returned by `wire({}?)` multiple times with the same template (content could differ, but the template is the same) you get patching behavior.
        - And as noted above, if you call `wire(obj)` with the same `obj` reference as a prior call to `wire`, you get the same function back, and if you then call that with the same template...
    - More importantly, you don't even need to return the nodes anywhere the second time.  They are patched _in place_ each time you call.  Seems magical, but isn't.
- It stands to reiterate this point: calling `wire()` on a template does return nodes, but every call also patches the returned nodes.  Thus after inserting the nodes, you don't need to actually do anything with the returned nodes; _calling `wire()` again will patch them in place_.
- With appropriate polyfills and transpilation, hyperHTML works in IE9.


### Some Other Exploration And Thoughts

- Wonder how hard it is to bodge a Context type thing into it?  Context is hugely useful for isolating an app's global services between app instances, and can really be used to create a great many other APIs.
    - Though, I suppose here it'd be more "Isolated between root ~~mount~~ bind points", but that's basically the same thing as far as I'm thinking here.
- Should explore [Neverland](https://github.com/WebReflection/neverland) (he likes silly names and themes, the wrapper is `stardust()`...).
    - Especially the source code may be very educational for seeing how he added React Hook style things, since I'm pretty sure that would cover what I wanted to do with my HyperHyperHTML. (That was also before I meditated more on how HyperHTML actually works.)



## Work Throughs


### The Ticker Example From the Site

```js
function tick(render) {
    // Some linters will complain about there being only an expression here,
    // no statement.  That's intentional, we're calling the `render` function
    // as a template function.
    render`
        <div class="tick">
            <h1>Tick Tock!</h1>
            <h2>It is now ${new Date().toLocaleTimeString()}!</h2>
        </div>
    `
}

const render = hyperHTML.bind(document.getElementById('app'))
const update = () => tick(render)
update()
setInterval(update, 1000)
// You could also do setInterval(tick, 1000, render) though
// I never use that form of setInterval...
// Better to waste memeroy with extra function creations.
```

It looks a bit odd since it doesn't reflect how things are used elsewhere in the docs, which usually look more like this:

```js
bind(el)`<div>some markup!</div>`
```

However, on further analysis it's the exact same thing:

```js
const render = bind(el)
render`<div>some markup!</div>`
```


### Ticker Example With Wire

Given the way Wire works, it's trivial to do the same ticker example with it: just append the results of the first call.  After that, you can discard the return results because the nodes are already in the DOM.

```js
const renderTick = hyperHTML.wire()
const el = document.getElementById('app')
const update = () => renderTick`
    <div class="tick">
        <h1>Ticky Tick Tick!</h1>
        <h2>It is now ${new Date().toLocaleTimeString()}!</h2>
    </div>
`
// renderTick`...` returns a DOM node, which we append.
el.appendChild(update())
setInterval(update, 1000)
```

In fact, you could even write a function which does that for you, which `bind`s an anonymous wire to a DOM element...


### Simple Components

Since calling `wire()` without an object creates a new anonymous Wire, we can use that to create Instance Factories.

```js
function Ticker() {
    const html = hyperHTML.wire()
    return function $Ticker({ title = 'Tick Tock!' }) {
        return html`
            <div class="ticker">
                <h1>${title}</h1>
                <h2>It is now ${new Date().toLocaleTimeString()}!</h2>
            </div>
        `
    }
}

function App(el) {
    const html = hyperHTML.bind(el)
    const ticker1 = Ticker()
    const ticker2 = Ticker()
    return function $App({
        title = 'App!',
        tickerTitles = ['Hi!', 'Hello!'] } = {}
    ) {
        return html`
            <h1>${title}</h1>
            ${ticker1({ title: tickerTitles[0] })}
            ${ticker2({ title: tickerTitles[1] })}
        `
    }
}

const update = App(document.getElementById('app'))
update()
// pull a title switcheroo
setInterval(update, 1000, { title: 'Bamboozled Again!', tickerTitles: ['Tick Tock!', 'Ticky Tick Tick!'] })
```

Now, that's kind of annoying, or rather, it makes dynamic children annoying.

There's a couple ways around that:
- Have a reference object that `wire` can bind to.
- Bind the Ticker's `wire` to `App` through some such object and use Wire IDs to get different instances/nodes.

Hmmm.  Something to think about.


### Event Reaction

You can pass functions or [`handleEvent` objects](https://medium.com/@WebReflection/dom-handleevent-a-cross-platform-standard-since-year-2000-5bf17287fd38) as handlers, easy as that.

```js
function Counter(el) {
    const render = hyperHTML.bind(el)
    const state = { clicks: 0 }
    const eventHandler = {
        handleEvent(event) {
            eventHandler['on' + event.type](event)
            $Counter()
        },

        onclick(event) {
            switch (event.target.dataset.action) {
                case 'increment':
                    state.clicks += 1
                    return
                case 'decrement':
                    state.clicks -= 1
                    return
                case 'reset':
                    state.clicks = 0
                    return
                default:
                    return
            }
        },
    }
    function $Counter() {
        render`
            <h1>Click Counter</h1>
            <h2>You've clicked this ${state.clicks} time${state.clicks === 1 ? '' : 's'}</h2>
            <div class="controls">
                <button onclick=${eventHandler} data-action="increment">+1</button>
                <button onclick=${eventHandler} data-action="decrement">-1</button>
                <button onclick=${eventHandler} data-action="reset">0</button>
            </div>
        `
    }
    return $Counter
}

const update = Counter(document.getElementById('app'))
```

For more trivial examples, you could even do something [like this](https://itnext.io/neverland-the-hyperhtmls-hook-a0c3e11324bb):

```js
const { wire } = hyperHTML
function Counter() {
  const view = wire();
  return function setCount(count) {
    return view`
      <p>You clicked ${count} times</p>
      <button onclick=${() => setCount(count + 1)}>
       Click me
      </button>
    `;
  }(0);
}
// Only necessary because Counter() here returns a NodeList
// since there are 2 top-level children
hyperHTML.bind(document.getElementById('app'))`${Counter()}`
```

Very zen.

As stated in the post, you can't really do that for more complex things, but still.  However, that linked post is really a post about [Neverland](https://github.com/WebReflection/neverland), which handles that stuff for you... (the examples don't use the Event Handler interface, but hey)
