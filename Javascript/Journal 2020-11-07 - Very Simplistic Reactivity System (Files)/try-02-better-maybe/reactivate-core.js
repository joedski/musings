let $currentContext = null;

export function reactivate(setup) {
  const context = createContext();

  const prevContext = $currentContext;
  $currentContext = context;

  $currentContext.updateCallback = setup();
  $currentContext.update();

  $currentContext = prevContext;

  return context;
}

export function createContext() {
  function update() {
    if (context.lastScheduledDraw != null) return;

    context.lastScheduledDraw = window.requestAnimationFrame(() => {
      context.lastScheduledDraw = null;

      const prevContext = $currentContext;
      $currentContext = context;

      context.updateCallback();

      $currentContext = prevContext;
    });
  }

  function cancelUpdate() {
    if (context.lastScheduledDraw == null) return;

    window.cancelAnimationFrame(context.lastScheduledDraw);
    context.lastScheduledDraw = null;
  }

  function destroy() {
    cancelUpdate();
    context.cleanupCallbacks.forEach(callback => callback());
  }

  const context = {
    updateCallback: () => {},
    lastScheduledDraw: null,
    cleanupCallbacks: [],

    update,
    cancelUpdate,
    destroy,
  };

  return context;
}

export function withContext(fn) {
  if ($currentContext == null) {
    throw new Error('withContext called when current context is null');
  }

  return fn($currentContext);
}

export function withEffect(effect) {
  withContext(context => {
    const cleanup = effect(context);

    if (cleanup != null) {
      context.cleanupCallbacks.push(cleanup);
    }
  });
}

export function withContextUpdate(fn) {
  withEffect(() => {
    return withContext(context => fn(context.update, context.cancelUpdate));
  });
}

export function eachElementEvent(elem, eventName, fn, options) {
  withEffect(() => {
    elem.addEventListener(eventName, fn, options);
    return () => elem.removeEventListener(eventName, fn, options);
  });
}

export function updateOnElementEvent(elem, eventName, options) {
  withContextUpdate(update => {
    elem.addEventListener(eventName, update, options);
    return () => event.removeEventListener(eventName, update, options);
  });
}
