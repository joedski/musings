Journal 2021-05-10 - Microlibrary to Splat Stuff Into HTML Templates
========

Not very useful, hardly efficient as written, but it sure is tiny and is a damn sight better than working directly with the DOM API.

But, if I wanted to do anything actually efficient, I'd probably just bring in µhtml and call it a day.  Mithril if I wanted something a bit friendlier, more "batteries included".

Basically, I wanted to take something like this:

```html
<template id="card-list-section">
  <section class="prose" class="card-list-section">
    <h3 class="card-list-section-title">Section Title</h3>

    <ul class="card-list">
      <!-- ... -->
    </ul>
  </section>
</template>

<template id="card-list-item">
  <li><span class="card-count">0</span> <span class="card-name">Card Name</span></li>
</template>

<template id="decklist">
  <div class="decklist prose">
    <h2 id="title">Deck Name</h2>

    <article class="prose" id="card-list-container">
    </article>
  </div>
</template>

<div id="decklist-root"></div>
```

And manipulate it like so:

```js
const sectionListVm = [
  { title: 'Section 1', items: ['Foo', 'Bar', 'Baz'] },
  { title: 'Section 2', items: ['Foo', 'Bar', 'Baz'] },
  { title: 'Section 3', items: ['Foo', 'Bar', 'Baz'] },
];

R.with(document.body, R.replaceIn({
  '#decklist-root': R.template('#decklist', {
    '#title': R.text('Test Title'),

    '#card-list-container': sectionListVm.map(sectionDef => R.template('#card-list-section', {
      '.card-list-section-title': R.text(sectionDef.title),
      '.card-list': sectionDef.items.map(itemName => R.template('#card-list-item', {
        '.card-count': R.text(1),
        '.card-name': R.text(itemName),
      })),
    })),
  }),
}));
```

This is actually quite easy to do, if not terribly efficient at the moment:

```js
window.R = (() => {
  return {
    with: withRoot,
    content,
    replaceIn,
    template,
    text,
  };

  /**
   * Creates a base context with a root element,
   * and applies a mutator to that root.
   *
   * Note that you shouldn't pass a mutator that outright replaces the original
   * root node as this does not replace it in the DOM if you do that.
   *
   * @param  {Element} root    Root element to operate on.
   * @param  {(context: Context) => Element} mutator Mutator function that returns
   *                             a node, presumably mutated in some fashion.
   *                             It might also replace the current node or just
   *                             create new content altogether.
   * @return {Element}         Mutated element or a new element altogether.
   */
  function withRoot(root, mutator) {
    return applyMutator(root, mutator, { root });
  }

  /**
   * Replace the content of the current target element with the new content
   * produced by the given mutator.  The mutator will be given a DocumentFragment
   * to mutate, and whatever the mutator returns is used as the new content.
   *
   * @param  {(context: Context) => Element} mutator Mutator function that returns
   *                             a node, presumably mutated in some fashion.
   *                             It might also replace the current node or just
   *                             create new content altogether.
   * @return {Element}         Mutated element or a new element altogether.
   */
  function content(mutator) {
    return function $content(context) {
      const currentTarget = context.currentTarget || context.root;
      const newContent = document.createDocumentFragment();

      currentTarget.innerHTML = '';

      currentTarget.append(applyMutator(newContent, mutator, context));

      return currentTarget;
    };
  }

  /**
   * Given an object mapping selectors to mutators, queries each selector
   * on the current target element and applies the given mutator to the
   * found element.
   *
   * Any selector that doesn't result in an element is skipped.
   *
   * @param  {{ [selector: string]: (context: Context) => Element }} mapping
   *         Mapping of selectors to mutators.
   * @return {Element} Element with the replacements performed on it.
   */
  function replaceIn(mapping) {
    return function $replaceIn(context) {
      const currentTarget = context.currentTarget || context.root;

      for (const [selector, mutator] of Object.entries(mapping)) {
        const el = currentTarget.querySelector(selector);

        if (el == null) continue;

        applyMutator(el, mutator, context);
      }

      return currentTarget;
    };
  }

  /**
   * Selects a `<template>` element in the _root_ of the current context,
   * creates a new deep clone of the template's contents, and runs a `replaceIn`
   * operation on that new template content.  This new template content is then
   * used as the content of the current target.
   * @param  {string} templateSelector Selector for the template to use.
   *                                   Selector is relative to root!
   * @param  {{ [selector: string]: (context: Context) => Element }} mapping
   *         Mapping of selectors to mutators.
   * @return {Element} Current target element, contents replaced by the new template contents.
   */
  function template(templateSelector, mapping) {
    return function $template(context) {
      const currentTarget = context.currentTarget || context.root;
      const template = context.root.querySelector(templateSelector);

      if (template == null) {
        throw new Error(`No template found in root for selector: ${templateSelector}`);
      }

      const el = template.content.cloneNode(true);

      const updatedEl = replaceIn(mapping)({
        ...context,
        currentTarget: el,
      });

      return applyMutator(currentTarget, updatedEl, context);
    }
  }

  /**
   * Replace the current target's text content with the given text.
   * @param  {string} textContent New text content.
   * @return {Element}             Current target, now with new text.
   */
  function text(textContent) {
    return function $text(context) {
      const currentTarget = context.currentTarget || context.root;

      currentTarget.textContent = textContent;

      return currentTarget;
    }
  }

  function applyMutator(el, mutator, context) {
    if (Array.isArray(mutator)) {
      el.innerHTML = '';
      el.append(...mutator.map(m => {
        const newContent = document.createDocumentFragment();
        return applyMutator(newContent, m, context);
      }));
      return el;
    }

    if (mutator instanceof Node) {
      el.innerHTML = '';
      el.append(mutator);
      return el;
    }

    if (typeof mutator === 'function') {
      return mutator({
        ...context,
        currentTarget: el,
      });
    }

    throw new Error(`Unknown mutator: ${mutator}`);
  }
})();
```

It's some 2.3 kB uncompressed, before I bloated it with docblocks anyway, making it very tiny indeed, but as should be quite evident it makes no attempt to save any existing elements and instead goes with the "throw it all out and re-create everything from scratch all the time every time" route.



## What About Events?

The above isn't all that event friendly, but we can make it work for bubbling events by just adding selectors to filter by target.

```js
this._stopListeners = listen(this.shadowRoot, {
  'change #decklist-deck-select': (event) => {
    // ... stuff
  },
});
```

This combined with the above gives us a poor version of what Backbone has.

```js
function ifTargetIs(selector, handler) {
  return function $ifTargetIs(event) {
    const possibleTargets = new Set(event.currentTarget.querySelectorAll(selector));

    if (possibleTargets.has(event.target)) {
      return handler(event);
    }
  };
}

function listen(el, mapping) {
  const listenerDefs = Object.entries(mapping);
  const registrations = [];

  for (const [eventAndSelector, handler] of listenerDefs) {
    const [event, selector] = eventAndSelector.split(/ +/);
    const wrappedHandler = selector ? ifTargetIs(selector, handler) : handler;

    el.addEventListener(event, wrappedHandler);

    registrations.push({
      event,
      handler: wrappedHandler,
    });
  }

  return () => {
    registrations.forEach(({ event, handler }) => {
      el.removeEventListener(event, handler);
    });
  };
}
```
