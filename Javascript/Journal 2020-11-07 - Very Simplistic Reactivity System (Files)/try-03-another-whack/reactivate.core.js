let $activeContext = null;

export function reactivate(defineApp) {
  const app = {};

  withNewContext((context) => {
    context.render = defineApp();

    app.reactivate = context.reactivate;
    app.deactivate = context.deactivate;
    app.redraw = context.redraw;
  });

  app.reactivate();
  app.redraw();

  return app;
}

function withNewContext(effect) {
  runInContext(effect, createNewContext());
}

function runInContext(effect, nextContext) {
  const lastContext = $activeContext;
  $activeContext = nextContext;

  withContext(effect);

  $activeContext = lastContext;
}

export function withContext(effect) {
  if ($activeContext == null) {
    throw new Error('Cannot access context when no context is active')
  }

  effect($activeContext);
}

function createNewContext() {
  const state = {
    /**
     * Flag for quick sanity checks.
     * @type {Boolean}
     */
    isActivated: false,

    /**
     * Render function defined by the library user.
     * This will be the function created by their app setup function.
     * @type {() => void}
     */
    render() {},

    /**
     * ID for our RAF request.
     * @type {number | null}
     */
    animationFrameId: null,

    /**
     * Basically, anything that requires setup and teardown.
     * @type {Effect[]}
     */
    effects: [],
  };

  /**
   * This is where things are actually hooked to the DOM.
   */
  function reactivate() {
    runInContext(() => {
      for (const effect of state.effects) {
        effect.reactivate();
      }
    }, context);

    state.isActivated = true;
  }

  /**
   * This cleans everything up, at least what has cleanup.
   */
  function deactivate() {
    runInContext(() => {
      for (const effect of state.effects) {
        effect.deactivate();
      }
    }, context);

    if (animationFrameId != null) {
      cancelAnimationFrame(state.animationFrameId);
      state.animationFrameId = null;
    }

    state.isActivated = false;
  }

  /**
   * Calls the created render function.
   */
  function redraw() {
    if (! state.isActivated) throw new Error('Cannot redraw deactivated app');

    if (state.animationFrameId == null) {
      state.animationFrameId = requestAnimationFrame(() => {
        if (! state.isActivated) throw new Error('Cannot redraw deactivated app');

        state.animationFrameId = null;
        state.render();
      });
    }
  }

  const context = {
    reactivate,
    deactivate,
    redraw,

    get render() { return state.render; },
    set render(next) { state.render = next; },

    get isActivated() {
      return state.isActivated;
    },

    get effects() {
      return state.effects;
    },
  };

  return context;
}

class Effect {
  constructor(runEffect, ...effectArgs) {
    this.runEffect = runEffect;
    this.effectArgs = effectArgs;
    this.cleanupEffect = null;
  }

  reactivate() {
    if (this.cleanupEffect != null) {
      throw new Error('Effect.reactivate() called more than once without call to Effect.deactivate()');
    }

    const cleanupEffect = this.runEffect(...this.effectArgs);

    if (cleanupEffect != null) {
      this.cleanupEffect = cleanupEffect;
    }
    else {
      this.cleanupEffect = () => {};
    }
  }

  deactivate() {
    if (this.cleanupEffect != null) {
      this.cleanupEffect();
    }

    this.cleanupEffect = null;
  }
}

export function useRedrawingEffect(runEffect) {
  withContext(context => {
    context.effects.push(new Effect(runEffect, {
      redraw: () => context.redraw(),
    }));
  });
}
