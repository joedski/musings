Journal 2020-07-03 - Learning WebComponents With An Eye Towards Vue Integration
========

Think I'm going to actually spend some time learning about WebComponents themselves, versus anything from a framework like Vue, Polymer (Though those are exposed as webcomponents... more or less), etc.

The benefit is mostly being able to create components that exist independent of any framework, using only the runtime available in any modern browser.

The downside of course is, most runtime things are more of low level tools used to build your own library than anything comprehensive like Vue or React.

Also the attributes centric way of passing data is annoying since it has a hard string-only restriction.  You can use properties, but not from a template.

Getting data out of the component at least is much easier: you can use events via `this.dispatchEvent<E extends Event>(event: E)` or just expose a getter.  Naturally the events way will be more relevant to use in a view rendering library.

This is really going to be geared towards writing Vue-friendly WebComponents that never the less also work independently.  Theoretically, if it can be made Vue-friendly, it can also be made React-friendly or anything-else friendly.

The idea then is to have as little extra glue between plain WebComponents and Vue as possible, and to have that glue as separable as possible.  Annotations might be good, though as of writing there's _still_ no settled Decorator spec.  Ugh.  (Though, not for lack of trying on the part of the proposers, that's for sure.)  That leaves... other stuff, I dunno.  Probably rigidly adhering to some pattern of usage, or else "manually decorating" by just attaching extra metadata directly to methods or something.

Eh.  Whatever.  Learn first.



## Some Links

1. A nice overview of slots in Custom Elements with examples: https://javascript.info/slots-composition
2. MDN Articles on Web Components: https://developer.mozilla.org/en-US/docs/Web/Web_Components
    1. Some Web Component examples I'm pretty sure are linked somewhere in those pages: https://github.com/mdn/web-components-examples



## Creating a Web Component (Updated)

If you were reading through the "Use With Vue" section and feeling confused about how it worked, then seeing that [the actual proof of concept was different](https://github.com/vuejs/vue-web-component-wrapper), well whoops.  I never updated that section with the results of the actual experiment.

At a high level, there's a few things to know about:

1. The [`CustomElementsRegistry`](https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry) singleton [`window.customElements`](https://developer.mozilla.org/en-US/docs/Web/API/Window/customElements).
2. Actually [using custom elements](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements), that's pretty important.


### Detailed Breakdown of The Experiment: Summary

To prod this directly myself and build intuition, I created an [actual proof of concept](https://github.com/vuejs/vue-web-component-wrapper).  There's actually a couple parts to this experiment, of course:

1. The Custom Element itself (`x-ticking-paragraph`)
2. The Vue Wrapper (`wrapWebComponent()`)

Let's go through those in order.


### Detailed Breakdown of The Experiment: The Custom Element Itself

Here we have a completely useless component that's not even properly named: a Paragraph that emits periodic `tick` events, and which is in fact a List, not a Paragraph.

```js
// Well, it's actually a list, now, not a paragraph...
customElements.define('x-ticking-paragraph', class XTickingParagraph extends HTMLElement {
  // Tell the browser to watch for changes on these attributes in the DOM, and
  // to call attributeChangedCallback() when they do.
  // Note that this doesn't apply if the JS itself changes a JS property!
  // Those are entirely separate from the attributes!
  static get observedAttributes() { return ['contents'] }

  constructor() {
    // Obligatory super() call.
    super();

    // Setup the shadow root of this component,
    // filling it in with the contents of our template.
    let shadowRoot = this.attachShadow({mode: 'open'});
    const template = document.querySelector('#x-ticking-paragraph');
    const instance = template.content.cloneNode(true);
    shadowRoot.appendChild(instance);

    // Initialization!
    this.initComponentProps();
    this.initComponentState();
  }

  // Create reactive behavior for the prop `contents`,
  // so that when it changes we redraw the contents of this component.

  set contents(value) {
    this._contents = (() => {
      if (Array.isArray(value)) {
        return value;
      }

      // Empty string, false, null, undefined
      if (! value) return [];

      return [String(value)];
    })();

    const listItems = document.createDocumentFragment();

    this._contents.forEach(itemText => {
      const listItem = document.createElement('li');
      listItem.innerText = itemText;
      listItems.appendChild(listItem);
    });

    // // https://stackoverflow.com/a/22966637
    // const renderTarget = this.shadowRoot.getElementById('renderTarget');
    // const renderTargetParent = renderTarget.parentElement;
    // const nextRenderTarget = renderTarget.cloneNode(false);
    // nextRenderTarget.appendChild(listItems);
    // renderTargetParent.replaceChild(renderTarget, nextRenderTarget);

    // Can't do that, shadowRoot isn't really an element, or
    // can't be a parentElement rather.
    const renderTarget = this.shadowRoot.getElementById('renderTarget');
    while (renderTarget.firstChild) {
      renderTarget.removeChild(renderTarget.lastChild);
    }
    renderTarget.appendChild(listItems);
  }

  get contents() {
    return this._contents;
  }

  // Some lifecycle callbacks...

  connectedCallback() {
    this.conditionallySyncTicker();
  }

  disconnectedCallback() {
    this.conditionallySyncTicker();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this[name] = newValue;
  }

  // Initialization.  Using method names instead of positional comments...

  initComponentProps() {
    this.contents = '';
  }

  initComponentState() {
    this._interval = null;
  }

  conditionallySyncTicker() {
    // This is done because, as the MDN docs note:
    //   connectedCallback may be called once your element is no longer connected,
    //   use Node.isConnected to make sure.
    if (this.isConnected && this._interval == null) {
      this._interval = setInterval(() => {
        this.dispatchEvent(new Event('tick'));
      }, 500);
    }
    else if (! this.isConnected && this._interval != null) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }
});
```

### Detailed Breakdown of The Experiment: The Custom Element's Template and Styles

In this case, these were embedded in the main HTML file.  However, a template could really be anywhere.  Maybe it's loaded from an external HTML file, or embedded as a string within the JS.  Who knows!

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Testing a Minimal Vue Wrapper for WebComponents</title>

  <!-- I'm lazy.  Hopefully unpkg doesn't spontaneously explode any time soon. -->
  <script src="https://unpkg.com/lodash@4.17.5"></script>
  <script src="https://unpkg.com/vue@2.6.11"></script>

  <!-- Load general deps. -->
  <script src="./wrapWebComponent.js"></script>

  <!-- Register web components before using them. -->
  <script src="./ticking-paragraph.js"></script>
</head>
<body>
  <template id="x-ticking-paragraph">
    <style>
      p, li {
        color: #42b983;
      }
    </style>
    <slot name="title">
      <h1>Title!</h1>
    </slot>
    <ul id="renderTarget">
    </ul>
  </template>

  <div id="app"></div>

  <script src="app.js"></script>
</body>
</html>
```




## Use With Vue

> NOTE: This SFC-style web component is not supported anywhere, not even in chrome.  This section is provided for historical reference.

There's plenty of ways to wrap up Vue components for use as WebComponents, ([`vue-web-component-wrapper`](https://github.com/vuejs/vue-web-component-wrapper), etc) but that's the opposite of what I want.

Interestingly, [this Alligator.io post about the very topic](https://alligator.io/vuejs/vue-integrate-web-components/) ~~seems to indicate you just need a setter or property on your webcomponent class body and it'll Just Work~~ shows you still need to set up some boilerplate, with the `attributeChangedCallback`.  That could be in a custom base class, which goes back to what I said about the built in JS stuff being low level tools you use to build your tools.

To wit, here's their HTML:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Vue + Web Components</title>
    <!-- Web Components Polyfill -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/webcomponentsjs/1.0.13/webcomponents-lite.js"></script>
    <!-- Loading our component -->
    <!-- NOTE: HTML Imports are no longer natively supported anywhere. -->
    <link rel="import" href="./ticking-paragraph.html">
  </head>
  <body>
    <div id="app"></div>
    <script src="/dist/build.js"></script>
  </body>
</html>
```

Here's their WebComponent:

```html
<template id="x-ticking-paragraph">
  <style>
    p {
      color: #42b983;
    }
  </style>
  <p id="renderTarget">
  </p>
</template>

<script>
  const currentScript = document.currentScript;

  customElements.define('x-ticking-paragraph', class extends HTMLElement {
    static get observedAttributes() { return ['contents'] }

    constructor() {
      super();
      let shadowRoot = this.attachShadow({mode: 'open'});
      const template = currentScript.ownerDocument.querySelector('#x-ticking-paragraph');
      const instance = template.content.cloneNode(true);
      shadowRoot.appendChild(instance);

      this.contents = '';

      setInterval(() => {
        this.dispatchEvent(new Event('tick'));
      }, 500);
    }

    set contents(value) {
      this._contents = value;
      this.shadowRoot.getElementById('renderTarget').innerText = this._contents;
    }

    get contents() {
      return this._contents;
    }

    attributeChangedCallback(name, oldValue, newValue) {
      this[name] = newValue;
    }
  });
</script>
```

> As they note, if this looks familiar it's because Vue's SFCs were based on the old WebComponent spec, which suggested doing things like this.

And here's their Vue App:

```js
import Vue from 'vue';
import App from './App.vue';

Vue.config.ignoredElements = [
  'x-ticking-paragraph'
]

new Vue({
  el: '#app',
  render: h => h(App)
});
```

Lastly, their App component:

```html
<template>
  <div id="app">
    <h1>Vue ❤ Web Components</h1>
    <x-ticking-paragraph :contents="paragraphContents" @tick="logTick"></x-ticking-paragraph>
  </div>
</template>

<script>
export default {
  data() {
    return {
      paragraphContents: `I'm data from Vue rendering in a Web Component!`
    };
  },

  methods: {
    logTick() {
      console.log(`The paragraph ticked again. >_>`);
    }
  }
}
</script>
```



## Other Options?

1. [SO Answer with some suggestions](https://stackoverflow.com/a/50416836)
    1. The most interesting suggestion there is using child elements to pass in the data, similar to `<select>` with `<option>`s.
2. Not plain WebComponents, but [lit-html assigns values to properties by default rather than via HTML attributes](https://github.com/Polymer/lit-element/issues/71#issuecomment-390754411), which is ultimately what I really want.


### On Using Children as Data

Basically, do what `<select>` with `<option>`s does.

Issues:

- Verbose unless you have a common conversion strategy.
- Might be less performant than just passing JSON strings, certainly more complex.
- Still only have text values, since HTML has no native way of encoding other things, so still have the serialization/deserialization problem, it's just punted to the values.
    - Granted, it's mostly the hierarchicality/collectioniv...ity? of things that's the major issue, and using HTML elements does solve that at least.  Extra verbosity could be invoked for other types.
    - But, if you're going to the bother of all that, why not just use JSON for, well, JS objects?

I think this is why Polymer just implemented their own thing that basically uses specific string formats to represent references.



## What To Do, Then?

One way to do it could be to just write components/tooling with enough static information exposed to allow automatic wrapping for working in JS-land with various frameworks, rather than in HTML-land.

That is, instead of doing the bindings via HTML attributes, the wrapper would instead set the JS properties, thus allowing one to pass data in.

Honestly, that probably just means exposing a list of properties to directly assign to because events already work as expected.  I'm not really sure there's much to do besides that.


### Exposing What Properties to Watch

My first thought was just adding another static getter to the class, a la `static get observedAttributes`, but on further reflection, there's really an easier way to do that: just match those attribute names enumerated in `observedAttributes` with the camelCase versions of properties defined on the prototype.

Alternatively, you could also just include a map of attributes to properties if you didn't want to bother with automatic case conversion as is popular in Vue, but I kind of like the symmetry between attributes and properties.  I suppose in some ways it also reflects the common way things are done in existing HTML elements, so there's that too.

I've implemented [a quick and dirty proof of concept using the first method](./webcomponent-experiments/vue-minimal-webcomponent-wrapper) and it seems to work well enough.  Events don't even need `nativeOn`, they Just Work, it's just props that need special consideration, using `domProps`.

Other tricky bits:

- Had to actually access each attr and prop by spreading them in order to register subscriptions.  I speculate that this is required because Vue does not record new subscriptions when actually rendering down to the DOM, only when the render function itself is called.
- The component itself could not have the same `name` as the custom element is registered with, that is to say it couldn't have the custom element name on the `name` option or you'll get an infinite recursion.  However, you can still use that name when adding the wrapper-component to the `components` option.
    - This does mean you cannot register that name globally using `Vue.component()`, or else you'll just create an infinite recursion during render.  You would have to register it with a different name in Vue if you wanted to do that.

Also not sure what (if anything) to do with Prop types.  That'd probably be extra info added via Reflect that stores... I dunno, JSON Schema.  That's the most general thing I can think of.



## Scoped Slots, Basically?

As noted, I saw no notion of directly supplying props to slots, since slots are just a way to slap elements from the light DOM into the shadow DOM, but I think it could be sorta emulated at least at an attribute or prop level.

The way this could be done in an opinionated manner (probably depends on the exact component) is:

- Give the slot element a `slotchange` listener.
- On `slotchange`, check `event.target.assignedNodes`.
- Assign props or attributes to those nodes.

The only issue there of course is that you then need a special adapter go back from HTML land to Vue (or other framework) land to ensure proper reactivity updates.  So, yanno, like a normal Custom Element that uses Vue as the render system, just that you have to make sure you're using the same Vue import.

Probably the only real issue is that you have to account for the elements first being created and mounted without any of the injected props.  Not a major thing, but definitely something you have to keep in mind.
