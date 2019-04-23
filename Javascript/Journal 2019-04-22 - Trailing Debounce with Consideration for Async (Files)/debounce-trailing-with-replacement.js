function createDeferred() {
  const deferred = {};

  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });

  return deferred;
}

function createDebounceTrailingWithAsyncReplacement({
  setTimeout = (...args) => window.setTimeout(...args),
  clearTimeout = (...args) => window.clearTimeout(...args),
} = {}) {
  return function debounceTrailingWithAsyncReplacement(
    /**
     * Async function to debounce.
     */
    fn,
    /**
     * Debounce time.
     */
    ms,
    /**
     * Optional handler for when the actually-settled call resolves.
     */
    onResolve,
    /**
     * Optional handler for when the actually-settled call rejects.
     */
    onReject
  ) {
    const name = `debounceTrailingWithAsyncReplacement(${fn.name || 'anonymous'})`;

    let outerDeferred = null;
    let timeoutId = null;
    let fnPromise = null;

    function executeFn(context, args) {
      const currentPromise = fnPromise = (async () => fn.apply(context, args))()
        .then(
          res => {
            if (outerDeferred && currentPromise === fnPromise) {
              outerDeferred.resolve(res);
              if (onResolve) onResolve(res);
              outerDeferred = null;
              fnPromise = null;
            }
          },
          error => {
            if (outerDeferred && currentPromise === fnPromise) {
              outerDeferred.reject(error);
              if (onReject) onReject(res);
              outerDeferred = null;
              fnPromise = null;
            }
          }
        );
      return currentPromise;
    }

    function clear() {
      outerDeferred = null;
      if (timeoutId != null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      fnPromise = null;
    }

    const debounced = {[name](...args) {
      if (! outerDeferred) {
        outerDeferred = createDeferred();
      }
      if (timeoutId != null) {
        clearTimeout(timeoutId);
      }
      if (fnPromise != null) {
        fnPromise = null;
      }

      timeoutId = setTimeout(() => {
        timeoutId = null;
        executeFn(this, args);
      }, ms);

      return outerDeferred.promise;
    }}[name];

    debounced.clear = clear;

    return debounced;
  };
}

const debounceTrailingWithAsyncReplacement = createDebounceTrailingWithAsyncReplacement();
module.exports = debounceTrailingWithAsyncReplacement;
module.exports.createDebounceTrailingWithAsyncReplacement = createDebounceTrailingWithAsyncReplacement;
