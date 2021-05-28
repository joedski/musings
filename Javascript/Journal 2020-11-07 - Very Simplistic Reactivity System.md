Journal 2020-11-07 - Very Simplistic Reactivity System
========

I was working on [joedski.github.io/musings/calculations](some calculations) and wrote it with functions for all the values just to make it easy to define once and recalculate every time.  (And then of course stuck all those in a function so all the functions get recreated every single time...)

Could I make some sort of reactivity thing like this?

Well, I mean, the answer is yes, because it's the same sort of thing that React Hooks does, having shared context controlled by the implementation that you implicitly call into via exposed functions.

I'm not going to go as fancy as React, rather just have an event-triggered-update-enqueing ala Mithril.

Currently, just dealing with text inputs, so we'll start with that.

Basic idea:

- Define input reads, derivations
- Return function that writes out updates
- As part of input reads, hook calls to updater



## First Whack

So, let's say we want to make a simple thing that just doubles the input and writes it to another field.

```js
function setup() {
  const inputValue = () => readTextInput('#input-value', parseFloat);
  const derivDoubled = () => inputValue() * 2;

  return () => {
    writeToTextInput('#deriv-doubled', derivDoubled().toExponential(2));
  };
}

function writeToTextInput(selector, value) {
  const elem = document.querySelector(selector);
  elem.value = String(value);
}

const deactivate = reactivate(setup);
```

```html
<body>
  <div><label for="input-value">Input:</label> <input type="text" id="input-value" value="3.14"></div>
  <div><label for="deriv-doubled">Doubled:</label> <input type="text" id="deriv-doubled" readonly value="..."></div>

  <script type="module" src="app.js"></script>
</body>
```

Basically, `reactivate()` will create a context, which `readTextInput()` will use to hold the event handlers.

It may help to think about this from the standpoint of `readTextInput()` itself, which does a few things:

1. Registers the event listener to the `scheduleUpdate()` function.
2. Reads the current value of the text input.

So, let's try going forward with that.

```js
/**
 * Current context being created, registered, etc.
 */
let currentContext = null;

export function reactivate(setup) {
  const context = createContext();

  // Suddenly, everything mysteriously works!
  context.update = setup();

  // And actually apply the magic!
  context.requestRedraw();

  return () => context.deactivate();
}

export function readTextInput(selector, parseValue) {
  const textInputElem = document.querySelector(selector);

  if (textInputElem == null) {
    throw new Error(`Could not find element matching selector: ${selector}`);
  }

  requestRedrawOnElementEvent(textInputElem, 'keyup');

  return parseValue(textInputElem.value);
}

function requestRedrawOnElementEvent(elem, eventName, options) {
  const context = getReactivateContext();
  const existingEventBinding = context.eventHandlers.get(elem);

  if (existingEventBinding != null) return;

  const requestRedraw = () => context.requestRedraw();

  const newEventBinding = {
    remove() {
      elem.removeEventListener(eventName, requestRedraw, options);
    },
  };

  context.eventHandlers.set(elem, newEventBinding);

  elem.addEventListener(eventName, requestRedraw, options);
}

function getReactivateContext() {
  if (currentContext == null) {
    throw new Error('Cannot get current context: no context exists outside of reactivate()');
  }

  return currentContext;
}

function createContext() {
  let nextRedraw = null;
  const eventHandlers = new Map();

  function requestRedraw() {
    if (nextRedraw != null) return;

    nextRedraw = window.requestAnimationFrame(redraw);
  }

  function redraw() {
    const priorContext = currentContext;

    // Magic!
    // push current context, update within it, then pop.
    currentContext = context;
    context.update();
    currentContext = priorContext;

    nextRedraw = null;
  }

  function deactivate() {
    if (nextRedraw != null) {
      window.cancelAnimationFrame(nextRedraw);
    }

    for (const [, eventBinding] of eventHandlers) {
      eventBinding.remove();
    }
  }

  const context = {
    // State
    eventHandlers,
    update: () => {},

    // Methods
    requestRedraw,
    deactivate,
  };

  return context;
}
```

Seems pretty good as a quick sketch.  One thing sticks out to me though: We can't do multiple event types per element in this setup.  That might be fine in very simplistic cases, but we may run into issues even with our examples.

Another thing is, given the above constraints about static pages, there's not much point to adding the ability to clean up.

Habit, I guess.

There was also no need to avoid using a class for context, so, there's that I guess.



## Could This Be Improved Upon?

What could we do better about the above?  Besides quite a lot?


### Considering Tracking What Schedules Redraws

Perhaps a bit more thought into how to track when to schedule redraws, and how to make sure we don't create duplicate registrations?  Should we even care, given they'd all just smack the `request animation frame if not already requested` button again, thereby debouncing all such calls?

What exactly are we tracking, anyway?  And is there anything we really need to do that couldn't be solved with a simple global "this time you can register events" flag?

It's hard to think entirely in the abstract space, but really easy to think in the concrete space, so let's follow the tried and true "extrapolate from concrete examples" methodology.

There's two common interactions I can think of off the top of my head:

1. Text Input (or any other textual input like number or whatever)
2. Click

In both cases, we want to map things to a value.

1. Text Input: by default we'd just get `elem.value`, but for most of my examples I want numbers so it ends up being `parseFloat(elem.value)` or `parseInt(elem.value, 10)`, etc.
2. Click: there's two main kinds of clicks, and one of them isn't a click as much as it is a `change` event.
    1. Button Click: In this case, what we're tracking is "was this button clicked this time".
        - Aside from buttons that themselves trigger a recalculation, which is usually not all that useful in this live-update thing, most buttons are really more useful when feeding into some form of state update.
        - Which brings up another interesting topic, but more on that later...
        - Examples of more useful (and stateful) type things would be mapping these clicks to incrementing/decrementing a value.
    2. Checkbox or Radio Selection: Here, we're dealing with the `change` event case, and we don't need to worry about tying things into state updates because they already hold the state themselves.
        - This means we can just directly read from them:
            - Radio: which one is selected?  because the `change` event only occurs on the one the user selected, we just read the `value` from that one.
            - Checkbox: Two different forms that are sorta related, depending on what exactly you want to do:
                - List of all selected values (and all not-selected values if you want)
                - Is particular value selected or not


### Small Aside: Arbitrary State

Before now, everything was all about elements we could just read the current value of.  Text inputs, check boxes, whatever.  Everything came with own-state!

Buttons that do something as simple as inecrement or decrement a number on the other hand rely on non-own state, because a button itself doesn't know about any value such as that, rather than "current value" state is separate.

This isn't too hard to do, though it's a bit roundabout.  Here's one way we could think of it:

```js
function setup() {
  let currentCountValue = 0;

  const stateCount = () => {
    const action = getValueFromEvents(
      { selector: '#input-incr', event: 'click', map: () => 'incr' },
      { selector: '#input-decr', event: 'click', map: () => 'decr' },
      () => 'nothing'
    );

    switch (action) {
      case 'incr': currentCountValue += 1; break;
      case 'decr': currentCountValue -= 1; break;
      default: break;
    }

    return currentCountValue;
  };

  return () => {
    writeToTextInput('#deriv-current-count', stateCount());
  };
}
```

The idea here is that `getValueFromEvents()` accepts a list of selectors and events and how to map ... the element I guess to a value.  From there, it reacts to which ever event triggered, returning the according mapped-value.

This is a trick, of course, because what really happens under the scenes is:

1. The given thing is clicked.
2. This sets a bit of internal state created by `getValueFromEvents`.
3. The according value mapper is called.
4. The resultant value is returned, in this example assigned to the var `action`.

What about when something else causes the redraw, rather than one of these buttons?

In that case, some default value will be returned.  `null` might seem reasonable, but honestly it's better to be explicit about it, so here that's handled by a last mapper function.


### Do We Need To Stick To Calling Things Inside Our Functions?

Another thing we might want to consider here is, do we really want to stick strictly to this "calling things inside our functions" pattern?  As seen above, it greatly complicates state tracking because we have to depend on parameters that usually change-by-identity every invocation to track our state.  That is to say, we have to somehow know what thing we're talking about by either DOM elements or by values within those things.

What if for inputs or other complex things, we moved the setup to outside ouf definition functions and they just returned "getValue" functions?  That'd be significantly simpler, as it would ensure setup only occurs once.

This would also simplify the above thing with the buttons with other-state.  Something like this would work:

```js
function setup() {
  const inputCounter = statefulValueUpdatedByEvents(
    0,
    { selector: '#input-incr', event: 'click', update: (state) => state + 1 },
    { selector: '#input-decr', event: 'click', update: (state) => state - 1 },
  );

  return () => {
    writeToTextInput('#deriv-current-count', inputCounter());
  };
}
```

This brings up another interesting point: if we do it like this, we don't even need to return a separate update function, because it essentially becomes a React-Hooks style function by itself, and we can just track the calls by when they're called internally!  That massively decomplicates internal state tracking.

Thus we get:

```js
function render() {
  const inputCounter = statefulValueUpdatedByEvents(
    0,
    { selector: '#input-incr', event: 'click', update: (state) => state + 1 },
    { selector: '#input-decr', event: 'click', update: (state) => state - 1 },
  );

  writeToTextInput('#deriv-current-count', inputCounter());
}
```

Internally it'd be something like a combination of `useState` and `useEffect` (because we're not returning a DOM representation we have to set events here) which means something different could also happen: instead of events leading to redraws, we could use state changes to lead to redraws.  Hmmmmm.

> How different that would actually be is debatable, it could be seen as more semantic than anything.  In one case we just went "on key up, redraw; read value from element" and in another we go "on key up, read value from element and put to state; on put to state, redraw; read value from state"



## Comparison: Streams

Another thing we could look at is a reactive stream library.

Mithril 2 has a very minimalistic and optional stream implementation which can be loaded separately.  Or alone!  At only 2kb compressed, it's a very viable option for plunking into random pages.  What might an implementation look like here?

Well, the Mithril 2 docs very clearly say that [streams do not cause redraws](https://mithril.js.org/stream.html#streams-do-not-trigger-rendering), but that's only if you're using Mithril itself (which you should definitely try!).  Of interest to us, however, is that a derived stream automatically update any time a parent updates, and it will update eagerly!  What does this mean for us?

We can do dirty nasty side effects in `Stream#map()`, like updating DOM elements.


### A First Sketch with Mithril 2 Streams

Here's a first sketch.  We kept the "update things on element event" aspect, because otherwise we wouldn't really know when to push new values.  It doesn't really matter that the "new" value is actually the same as the old value, it prompts an update anyway.

That means we can just create a stream of that element itself, then derive a stream by extracting whatever value we want from the element.

This can be handled in some utility functions:

```js
// This is where the build artifact puts it.
const Stream = window.m.stream;

function getElement(selOrElem) {
  if (typeof selOrElem === 'string') {
    return document.querySelector(selOrElem);
  }

  return selOrElem;
}

function getAllElements(multiSelOrElemList) {
  if (typeof multiSelOrElemList === 'string') {
    return [...document.querySelectorAll(multiSelOrElemList)];
  }

  if (! Array.isArray(multiSelOrElemList)) {
    return [multiSelOrElemList];
  }

  return multiSelOrElemList;
}

function streamFromElementEvent(selOrElem, eventName, options) {
  const elem = getElement(selOrElem);
  const stream = Stream();

  elem.addEventListener(eventName, stream, options);
  stream.end.map(() => {
    elem.removeEventListener(eventName, stream, options);
  });

  return stream;
}

function streamFromElementUpdatedOnEvent(selOrElem, eventName, options) {
  const elem = getElement(selOrElem);
  const eventStream = streamFromElementEvent(elem, eventName, options);
  const elemStream = eventStream.map(event => event.target);

  // Yeah, yeah, kinda hacky, but we're going from Event to Behavior
  // so we need an initial value.
  elemStream(elem);

  return elemStream;
}

function streamFromAllElementsUpdatedOnEvent(multiSelOrElemList, eventName, options) {
  const elemList = getAllElements(multiSelOrElemList);
  const elemStreamList = elemList.map(
    elem => streamFromElementUpdatedOnEvent(elem, eventName, options)
  );
  return Stream.merge(elemStreamList);
}

function withElement(sel, fn) {
  return fn(document.querySelector(sel));
}
```

That in mind, our actual app code is again quite succinct:

```js
const Stream = window.m.stream;

const inputValue = streamFromElementUpdatedOnEvent('#input-value', 'keyup')
  .map(elem => parseFloat(elem.value))
  ;

const inputMultiplyByChoice = streamFromAllElementsUpdatedOnEvent(
  '[name=input-multiply-by]',
  'change'
).map((radioset) => {
  const checkedRadioElem = radioset.find(elem => elem.checked);
  if (! checkedRadioElem) return 2;
  return parseFloat(checkedRadioElem.value);
});

const derivMultiplied = Stream.lift(
  (value, multiplyByChoice) => value * multiplyByChoice,
  inputValue, inputMultiplyByChoice
);

derivMultiplied.map(withElement('#deriv-doubled', elem => value => {
  elem.value = value;
}));
```



## What If We Want Complete Rendering?

Just going further down the exploration rabbit hole, we could just entirely take over rendering rather than drafting the content in the HTML first.

In such cases we could just whip out all of Mithril, but I want to go smaller.  I want to go micro... HTML.

I mean... [µhtml](https://github.com/WebReflection/uhtml).

This is what you get when you take HyperHTML (which I still think is the best name ever) and boil it down to just the barest necessary to implement the conceit.


### The Simple Test App In µhtml

It's not hard to use, though may look odd compared to other more typical things.

Again, I'll do up the simple multiplier example, just to keep things consistent.  Just remember that `html` (and `svg`) creates content, and `render()` plunks them somewhere.

It's very literal (in multiple ways!) and concise: every event that causes an update simply calls the update function again with the new state, and the app is bootstrapped by making an initial update with an initial state.  Simple!  Not bad for 1.8kb!

I went with a Redux style immutable state here, but honestly this simple example could've just directly mutated the data, since each event is causing a redraw.

```js
import { render, html, svg } from 'https://unpkg.com/uhtml?module';

function initState() {
  return {
    inputValue: 3.14,
    multiplier: 2,
  };
}

function MultiplyOption({ state, id, value, onchange }) {
  return html`
    <div>
      <input
        type="radio"
        id=${id}
        .checked=${state.multiplier === value}
        onchange=${() => onchange(value)}
      >
      <label for=${id}>Multiply by ${value}</label>
    </div>
  `;
}

function App(rootSel) {
  const root = document.querySelector(rootSel);

  return function update(state) {
    return render(root, html`
      <div>
        <label for="input-value">Input:</label>
        <input
          id="input-value"
          type="text"
          value=${state.inputValue}
          onkeyup=${event => update({
            ...state,
            inputValue: parseFloat(event.target.value),
          })}
        >
      </div>
      <div>
        ${MultiplyOption({
          state,
          id: 'input-multiply-by-2',
          value: 2,
          onchange: multiplier => update({ ...state, multiplier })
        })}
        ${MultiplyOption({
          state,
          id: 'input-multiply-by-3',
          value: 3,
          onchange: multiplier => update({ ...state, multiplier })
        })}
      </div>
      <div>
        <label for="deriv-result">Result:</label>
        <input
          id="deriv-result"
          type="text"
          readonly
          value=${state.inputValue * state.multiplier}
        >
      </div>
    `);
  };
}

// we could also use body.
const app = App('#app');

// Kick things off.
const appElem = app(initState());
```



## Give It Another Go?

Just a rehash of [the same thing as before](./Journal%202020-11-07%20-%20Very%20Simplistic%20Reactivity%20System%20%28Files%29/try-02-better-maybe), but [a little better organized this time](./Journal%202020-11-07%20-%20Very%20Simplistic%20Reactivity%20System%20%28Files%29/try-03-another-whack), I think.  Or maybe not.  The previous one had a certain elegance to it that I think better answered the "this is the only thing I need to do" nature of this problem.

Maybe just give that another pass over and create some common components?  Hm.
