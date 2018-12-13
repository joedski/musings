// function Component(renderComponent) {
//   return function $Component(key, props) {
//     if (props === undefined && typeof key === 'object') {
//       props = key
//       key = undefined
//     }
//
//     // Component VNode
//     return {
//       type: renderComponent,
//       // may be null/undef
//       props,
//       // may be null/undef
//       key,
//     }
//   }
// }
//
// function ConuterRender() {
//   return this.html`
//     <div class="counter">
//       <span class="counter-value">${this.state.value}</span>
//       <button
//         class="counter-control"
//         data-action="increment"
//         onclick="${this}"
//       >Incr (${this.props.increment})</button>
//     </div>
//   `
// }
//
// const Counter = Component(CounterRender)

function AppRender() {
  return this.html`
    <div class="app">
      <div class="app-title">${this.props.title}</div>
      ${this.state.counters.map(counter => Counter(counter))}
    </div>
  `
}

const App = Component(App)

function component_html(templateStrings, ...templateValues) {
  return this.patch({
    templateStrings,
    templateValues,
  })
}



////////////////////////////////////////



function renderLocalRoot({ type, props, rep }) {
  const nextRep = {
    ...rep,
    instance: {
      ...rep.instance,
      props,
    },
  }
  Object.assign(nextRep, type.call(nextRep.instance))
  if (rep.templateStrings !== nextRep.templateStrings) {
    // TODO: Treat as full unmount-old-mount-new.
  }
  // ...
}



////////////////////////////////////////



const IS_COMPONENT = Symbol('isComponent')
const cacheStore = new WeakMap()

function Counter() {
  return this.html`
    <div class="counter">
      <span class="counter-value">${this.state.value}</span>
      <button
        class="counter-control"
        data-action="increment"
        onclick="${this}"
      >Incr (${this.props.increment})</button>
    </div>
  `
}

function renderApp(el) {
  const cache = cacheStore.get(el) || { rootRep: {} }

  const rep = cache.rootRep

  // ...?

  const repHtml = (templateStrings, ...templateValues) => ({ templateStrings, templateValues })
  rep.instance = rep.instance || {
    state: {
      counters: [
        { increment: 1 },
        { increment: 2 },
      ],
    },
    props: {
      title: 'Counters!',
    },
    html: repHtml,
    wire: hyperHTML.wire(),
  }
  const nextTemplateThings = (function App() {
    return this.html`
      <div class="app">
        <div class="app-title">${this.props.title}</div>
        ${this.state.counters.map(counter => ({
          [IS_COMPONENT]: true,
          type: Counter,
          key: null,
          props: counter,
        }))}
      </div>
    `
  }).call(rep.instance)

  // TODO: Handle case where nextTemplateThings.templateStrings changes.

  nextTemplateThings.templateValues.forEach((nextValue, index) => {
    if (nextValue.key == null) {
      nextValue.key = index
    }

    // TODO: How to use key here?
    const prevValue = rep.templateValues[index]

    if (Array.isArray(nextValue)) {
      // TODO: Array Children!
    }
    else if (nextValue[IS_COMPONENT]) {
      const willCreateNext = !prevValue || prevValue.type !== nextValue.type
      const willDestroyPrev = !nextValue || prevValue.type !== nextValue.type

      if (willDestroyPrev) {
        // destroy...
      }

      if (willCreateNext) {

      }
    }
  })

  Object.assign(rep, nextTemplateThings)

  const domContent = hyperHTML.wire(rep)(rep.templateStrings, ...rep.renderedTemplateValues)

  hyperHTML.bind(el)`${domContent}`
  cacheStore.set(el, cache)
}
