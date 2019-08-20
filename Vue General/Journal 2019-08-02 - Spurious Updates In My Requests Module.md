Journal 2019-08-02 - Spurious Updates In My Requests Module
========

> It's more likely than you think!



## Original Code (Without TS Stuff)

```js
export const requests = {
  namespaced: true,

  state: {
    requests: {},
  },

  getters: {
    requestState(state) {
      const requestStates = state.requests;

      return function $readRequestStateOfRequest(config) {
        const key = keyOfConfig(config);

        if (requestStates[key]) {
          return requestStates[key];
        }

        return null;
      };
    },
    requestData(state) {
      const requestStates = state.requests;

      return function $readRequestDataOfRequest(config) {
        const requestState = requestStates[keyOfConfig(config)];

        if (requestState && requestState.data) {
          return requestState.data;
        }

        return AsyncData.NotAsked();
      };
    },
  },

  mutations: {
    /**
     * First way I did it.  Always pings state.requests.
     */
    SET_REQUEST_STATE_1(state, payload) {
      Vue.set(
        state.requests,
        payload.key,
        Object.assign(state.requests[payload.key] || {}, payload.updates)
      );
    },
    /**
     * Second way I did it.  Should only ping state.requests
     * if a request has never been made before.
     */
    SET_REQUEST_STATE_2(state, payload) {
      if (!state.requests[payload.key]) {
        Vue.set(state.requests, payload.key, payload.updates);
      } else {
        Object.entries(payload.updates).forEach(([key, value]) => {
          Vue.set(state.requests[payload.key], key, value);
        });
      }
    },
    CLEAR_REQUEST_STATE(state, payload) {
      Vue.delete(state.requests, payload);
    },
  },

  actions: {
    async request(context, config) {
      const requestStateBefore = context.getters.requestState(config);
      if (requestStateBefore && requestStateBefore.promise) {
        return requestStateBefore.promise;
      }

      const key = keyOfConfig(config);

      const promise = Axios(config)
        .then(response => {
          // NOTE: If the validate function fails, it will throw an Error.
          const responseData = validateResponseData(config, response.data);

          commitSetRequestState(context, {
            key,
            updates: {
              promise: null,
              data: AsyncData.Data(responseData),
            },
          });

          return responseData;
        })
        .catch(error => {
          commitSetRequestState(context, {
            key,
            updates: {
              promise: null,
              data: AsyncData.Error(error),
            },
          });

          throw error;
        });

      context.commit('SET_REQUEST_STATE_1', {
        key,
        updates: {
          promise,
          data: AsyncData.Waiting(),
        },
      });

      return promise;
    },
    resetRequest(context, config) {
      const key = keyOfConfig(config);
      context.commit('CLEAR_REQUEST_STATE', key);
    },
  },
};

// NOTE: We were using typesafe-vuex.
export function readRequestData(store, config) {
  return store.getters['requests/requestData'](config);
}
```

What I noticed:

> TK: list with work-specific stuff scrubbed



## Minimal Example

> TK rewrite this to not be requset specific; or just use commits directly since it doesn't matter where those come from, only that they occur and induce the behavior, and that the various different ways I tried getting around it don't affect things.  Which is good, I guess, because it means Vue itself has fewer edge cases.

```js
// minimal impl.
const AsyncData = {
  NotAsked: () => ['NotAsked'],
  Waiting: () => ['Waiting'],
  Error: (error) => ['Error', error],
  Data: (data) => ['Data', data],
}

export const requests = {
  namespaced: true,

  state: {
    requests: {},
  },

  getters: {
    requestState(state) {
      const requestStates = state.requests;

      return function $readRequestStateOfRequest(config) {
        const key = keyOfConfig(config);

        if (requestStates[key]) {
          return requestStates[key];
        }

        return null;
      };
    },
    requestData(state) {
      const requestStates = state.requests;

      return function $readRequestDataOfRequest(config) {
        const requestState = requestStates[keyOfConfig(config)];

        if (requestState && requestState.data) {
          return requestState.data;
        }

        return AsyncData.NotAsked();
      };
    },
  },

  mutations: {
    /**
     * First way I did it.  Always pings state.requests.
     */
    SET_REQUEST_STATE_1(state, payload) {
      Vue.set(
        state.requests,
        payload.key,
        Object.assign(state.requests[payload.key] || {}, payload.updates)
      );
    },
    /**
     * Second way I did it.  Should only ping state.requests
     * if a request has never been made before.
     */
    SET_REQUEST_STATE_2(state, payload) {
      if (!state.requests[payload.key]) {
        Vue.set(state.requests, payload.key, payload.updates);
      } else {
        Object.entries(payload.updates).forEach(([key, value]) => {
          Vue.set(state.requests[payload.key], key, value);
        });
      }
    },
    CLEAR_REQUEST_STATE(state, payload) {
      Vue.delete(state.requests, payload);
    },
  },

  actions: {
    async request(context, config) {
      const requestStateBefore = context.getters.requestState(config);
      if (requestStateBefore && requestStateBefore.promise) {
        return requestStateBefore.promise;
      }

      const key = keyOfConfig(config);

      const promise = Axios(config)
        .then(response => {
          // NOTE: If the validate function fails, it will throw an Error.
          const responseData = validateResponseData(config, response.data);

          commitSetRequestState(context, {
            key,
            updates: {
              promise: null,
              data: AsyncData.Data(responseData),
            },
          });

          return responseData;
        })
        .catch(error => {
          commitSetRequestState(context, {
            key,
            updates: {
              promise: null,
              data: AsyncData.Error(error),
            },
          });

          throw error;
        });

      context.commit('SET_REQUEST_STATE_1', {
        key,
        updates: {
          promise,
          data: AsyncData.Waiting(),
        },
      });

      return promise;
    },
    resetRequest(context, config) {
      const key = keyOfConfig(config);
      context.commit('CLEAR_REQUEST_STATE', key);
    },
  },
};

function readRequestData1(store, config) {
  return store.getters['requests/requestData'](config);
}

function readRequestData2(store, config) {
  const requestState = store.state.requests.requests[requestKey];
  if (requestState && requestState.data) return requestState.data;
  return AsyncData.NotAsked();
}

function readRequestData3(store, config) {
  const requestKey = keyOfConfig(config);
  try {
    return store.state.requests.requests[requestKey].data;
  } catch (error) {
    return AsyncData.NotAsked();
  }
}
```
