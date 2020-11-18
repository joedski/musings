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
