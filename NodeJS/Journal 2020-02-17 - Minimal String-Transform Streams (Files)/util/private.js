// @ts-check

/**
 * @template TProps
 * @param {() => TProps} getInitial
 */
exports.createPrivateStore = function createPrivateStore(getInitial) {
  /** @type {WeakMap<any, TProps>} */
  const store = new WeakMap();

  /**
   * @param {any} self
   * @returns {TProps}
   */
  function get(self) {
    if (store.get(self) === undefined) {
      store.set(self, getInitial());
    }

    return store.get(self);
  }

  /**
   * @param {any} self
   * @param {TProps} next
   */
  function set(self, next) {
    store.set(self, next);
  }

  return {
    get,
    set,
  };
};
