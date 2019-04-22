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
  return function debounceTrailingWithAsyncReplacement(fn, n) {
    const name = `debounceTrailingWithAsyncReplacement(${fn.name || 'anonymous'})`;

    let outerDeferred = null;
    let timeoutId = null;
    let fnPromise = null;

    function executeFn(context, args) {
      const currentPromise = fnPromise = (async () => fn.apply(context, args))();
      fnPromise
        .then(res => {
          if (outerDeferred && currentPromise === fnPromise) {
            outerDeferred.resolve(res);
            outerDeferred = null;
            fnPromise = null;
          }
        })
        .catch(error => {
          if (outerDeferred && currentPromise === fnPromise) {
            outerDeferred.reject(error);
            outerDeferred = null;
            fnPromise = null;
          }
        });
      return currentPromise;
    }

    return {[name](...args) {
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
      }, n);

      return outerDeferred.promise;
    }}[name];
  };
}

const debounceTrailingWithAsyncReplacement = createDebounceTrailingWithAsyncReplacement();
module.exports = debounceTrailingWithAsyncReplacement;
module.exports.createDebounceTrailingWithAsyncReplacement = createDebounceTrailingWithAsyncReplacement;
