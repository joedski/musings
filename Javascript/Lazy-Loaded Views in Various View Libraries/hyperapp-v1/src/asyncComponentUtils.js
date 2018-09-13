export const STATE_KEY = '$$asyncComponents'

export const COMPONENT_STATUS = {
  NOT_ASKED: 'NOT_ASKED',
  WAITING: 'WAITING',
  ERROR: 'ERROR',
  SUCCESS: 'SUCCESS',
}

export function initState() {
  return {
    // This is mutable shared state!
    activeRequests: new Map(),
    components: {},
  }
}

export function initComponentState(overrides) {
  return {
    status: COMPONENT_STATUS.WAITING,
    // Whether or not to show the loading immediately or not.
    showLoading: false,
    render: null,
    error: null,
    ...overrides,
  }
}

// Getters local to our state slice.
// Used internally.

function localGetComponentState(componentKey, localState) {
  return localState.components[componentKey]
}

function localGetComponentStatus(componentKey, localState) {
  const componentState = localGetComponentState(componentKey, localState)

  if (componentState == null) {
    return COMPONENT_STATUS.NOT_ASKED
  }

  return componentState.status
}

// Getters used on global state.
// Used in components, etc.

export function getComponentState(componentKey) {
  return function $getComponentState(state) {
    return localGetComponentState(componentKey, state[STATE_KEY])
  }
}

export function getComponentStatus(componentKey) {
  return function $getComponentStatus(state) {
    return localGetComponentStatus(componentKey, state[STATE_KEY])
  }
}

export function getComponentRenderer(componentKey) {
  const $getComponentState = getComponentState(componentKey)
  const $getComponentStatus = getComponentStatus(componentKey)

  return function $getComponentRenderer(state) {
    const status = $getComponentStatus(state)
    const componentState = $getComponentState(state)
    switch (status) {
      case COMPONENT_STATUS.SUCCESS:
        return componentState.render

      default:
        return null
    }
  }
}

export function getComponentError(componentKey) {
  const $getComponentState = getComponentState(componentKey)

  return function $getComponentError(state) {
    const error = ($getComponentState(state) || {}).error
    if (!error) return null
    return error
  }
}

export function getComponentIsLoading(componentKey) {
  return function $getComponentIsLoading(state) {
    return state[STATE_KEY].activeRequests.has(componentKey)
  }
}

export function getComponentShouldShowLoading(componentKey) {
  const $getComponentState = getComponentState(componentKey)

  return function $getComponentShouldShowLoading(state) {
    return Boolean(($getComponentState(state) || {}).showLoading)
  }
}

function sleep(timeout) {
  return new Promise(resolve => setTimeout(resolve, timeout))
}

function execLoadEffect(key, load, { delay, timeout, onDelayElapse }) {
  return new Promise(($resolve, $reject) => {
    let isSettled = false;

    const resolve = (r) => {
      isSettled = true;
      $resolve(r)
    }
    const reject = (r) => {
      isSettled = true;
      $reject(r)
    }

    // eslint-disable-next-line no-unused-vars
    const loadPromise = load().then((l) => {
      if (! isSettled) resolve(l)
    })
    // eslint-disable-next-line no-unused-vars
    const delayPromise = (
      (Number.isFinite(delay) && delay >= 0)
      ? sleep(delay).then(() => {
        if (! isSettled) onDelayElapse()
      })
      : null
    )
    // eslint-disable-next-line no-unused-vars
    const errorPromise = (
      (Number.isFinite(timeout) && timeout > 0)
      ? sleep(timeout).then(() => {
        if (! isSettled) reject(new Error(`Async component ${key} timed out`))
      })
      : null
    )
  })
}

export const actions = {
  load: ({ key, load, delay, timeout }) => (state, actions) => {
    switch (localGetComponentStatus(key, state)) {
      // NOTE: Assuming each key is globally unique,
      // and that any given key corresponds to a single given component.
      case COMPONENT_STATUS.NOT_ASKED:
        actions.retry({ key, load, delay, timeout })
        return

      default:
        return
    }
  },
  retry: ({ key, load, delay, timeout }) => (state, actions) => {
    actions.await({ key })

    const p = execLoadEffect(key, load, {
      delay,
      timeout,
      onDelayElapse() {
        actions.showLoading({ key })
      },
    })
    .then(asyncComponentModule => {
      actions.succeed({ key, render: asyncComponentModule.default })
    })
    .catch(error => {
      actions.error({ key, error })
    })
    .then(() => {
      state.activeRequests.delete(key)
    })

    state.activeRequests.set(key, p)
  },
  await: ({ key, showLoading }) => (state) => ({
    components: {
      ...state.components,
      [key]: initComponentState({ showLoading }),
    },
  }),
  showLoading: ({ key }) => (state) => ({
    components: {
      ...state.components,
      [key]: {
        ...state.components[key],
        showLoading: true,
      },
    },
  }),
  succeed: ({ key, render }) => (state) => ({
    components: {
      ...state.components,
      [key]: {
        ...state.components[key],
        status: COMPONENT_STATUS.SUCCESS,
        render,
      },
    }
  }),
  error: ({ key, error }) => (state) => ({
    components: {
      ...state.components,
      [key]: {
        ...state.components[key],
        status: COMPONENT_STATUS.ERROR,
        error,
      },
    }
  }),
}

export function AsyncComponent(key, load, options = {}) {
  const {
    renderLoading = () => null,
    renderError = () => null,
    // Default values stolen from vue's.
    // delay in ms before showing the loading state.
    // During that time nothing will be rendered instead.
    delay = 200,
    // How long in ms to wait before declaring the load a failure.
    // Even if the component eventually loads after this timeout,
    // the error state will still be shown until the next time
    // it's attempted.
    timeout = 2000,
  } = options

  const $getComponentStatus = getComponentStatus(key)
  const $getComponentError = getComponentError(key)
  const $getComponentRenderer = getComponentRenderer(key)
  const $getComponentIsLoading = getComponentIsLoading(key)
  const $getComponentShouldShowLoading = getComponentShouldShowLoading(key)

  return function $AsyncComponent(props) {
    const $renderLoading = props.renderLoading || renderLoading
    const $renderError = props.renderError || renderError

    return function $$AsyncComponent(state, actions) {
      // This is done this way to ensure we only call
      // actions.load() once per render pass for a given key.
      if (
        $getComponentStatus(state) === COMPONENT_STATUS.NOT_ASKED
        && ! $getComponentIsLoading(state)
      ) {
        actions[STATE_KEY].load({ key, load, delay, timeout })
      }

      switch ($getComponentStatus(state)) {
        default:
        case COMPONENT_STATUS.NOT_ASKED:
          return null

        case COMPONENT_STATUS.WAITING:
          if ($getComponentShouldShowLoading(state))
            return $renderLoading()
          else
            return null

        case COMPONENT_STATUS.ERROR:
          return $renderError($getComponentError(state))

        case COMPONENT_STATUS.SUCCESS:
          return $getComponentRenderer(state)(props)
      }
    }
  }
}
