const assert = require('assert');

const createDeferred = require('@joedski--local/deferred');
const createAsyncQueue = require('@joedski--local/async-queue');
const createTimeoutFns = require('@joedski--local/timeout-mock');

const { createDebounceTrailingWithAsyncReplacement } = require('./debounce-trailing-with-replacement');


Promise.resolve()
.then(function creatingTheDebounceCreator() {
  assert.doesNotThrow(() => {
    const timeouts = createTimeoutFns();
    const debounce = createDebounceTrailingWithAsyncReplacement({
      setTimeout: timeouts.setTimeout,
      clearTimeout: timeouts.clearTimeout,
    });
  },
    'Creating a debouncer should not throw'
  );
})
.then(function creatingDebouncedFn() {
  assert.doesNotThrow(() => {
    const timeouts = createTimeoutFns();
    const debounce = createDebounceTrailingWithAsyncReplacement({
      setTimeout: timeouts.setTimeout,
      clearTimeout: timeouts.clearTimeout,
    });
    const fn = () => Promise.resolve();
    const debounced = debounce(fn, 500);
  },
    'Creating a debounced function should not throw'
  );
})
.then(function basicUsage_noArgs() {
  const timeouts = createTimeoutFns();
  const queue = createAsyncQueue();
  const debounce = createDebounceTrailingWithAsyncReplacement({
    setTimeout: timeouts.setTimeout,
    clearTimeout: timeouts.clearTimeout,
  });
  let resolutions = 0;
  const fn = () => queue.enqueue().then((v) => { resolutions += 1; return v; });
  const debounced = debounce(fn, 500);

  const promise = debounced();

  assert.equal(
    resolutions, 0,
    'Nothing should resolve immediately'
  );

  assert.equal(
    timeouts.pending.length, 1,
    'There should be 1 timeout after a single call'
  );

  assert.equal(
    queue.queue.length, 0,
    'Nothing should be called until the timeout elapses'
  );

  timeouts.advanceTime(500);

  assert.equal(
    resolutions, 0,
    'Nothing should resolve on timeout (timeout should be async)'
  );

  assert.equal(
    timeouts.pending.length, 0,
    'There should be 0 timeouts after debounce time has elapsed'
  );

  assert.equal(
    queue.queue.length, 1,
    'After timeout, the async call should be executed'
  );

  queue.resolveNext('yay');

  return promise.then((v) => {
    assert.equal(
      queue.queue.length, 0,
      'After resolution, there should be no pending promises'
    );

    assert.equal(
      resolutions, 1,
      'After resolution, there should be 1 counted resolution'
    );

    assert.equal(
      v, 'yay',
      'Value resolved to by debounced function should be expected value resolved to by called function'
    );
  });
})
.then(function basicUsage_noArgs_nextCallDuringTimeout() {
  const timeouts = createTimeoutFns();
  const queue = createAsyncQueue();
  const debounce = createDebounceTrailingWithAsyncReplacement({
    setTimeout: timeouts.setTimeout,
    clearTimeout: timeouts.clearTimeout,
  });
  let resolutions = 0;
  const fn = () => queue.enqueue().then((v) => { resolutions += 1; return v; });
  const debounced = debounce(fn, 500);

  const promise1 = debounced();

  timeouts.advanceTime(250);

  assert.equal(
    resolutions, 0,
    'Nothing should resolve immediately'
  );

  assert.equal(
    timeouts.pending.length, 1,
    'There should be 1 timeout after a single call'
  );

  assert.equal(
    queue.queue.length, 0,
    'Nothing should be called until the timeout elapses'
  );

  const promise2 = debounced();

  assert.equal(
    promise1, promise2,
    'A second call made when the timeout of the first call has not elapsed should result in the same promise'
  );

  assert.equal(
    timeouts.pending.length, 1,
    'There should be 1 timeout after a second call'
  );

  assert.equal(
    queue.queue.length, 0,
    'Nothing should be called until the timeout elapses, even on a second call'
  );

  timeouts.advanceTime(250);

  assert.equal(
    timeouts.pending.length, 1,
    'There should be 1 timeout after a single call, where the second call timeout has not yet elapsed'
  );

  assert.equal(
    queue.queue.length, 0,
    'Nothing should be called until the timeout elapses, where a second call has reset the timeout'
  );

  timeouts.advanceTime(250);

  assert.equal(
    timeouts.pending.length, 0,
    'There should be 0 timeouts after debounce time has elapsed'
  );

  queue.resolveNext('yay');

  return promise2.then((v) => {
    assert.equal(
      queue.queue.length, 0,
      'After resolution, there should be no pending promises'
    );

    assert.equal(
      resolutions, 1,
      'After resolution, there should be 1 counted resolution'
    );

    assert.equal(
      v, 'yay',
      'Value resolved to by debounced function should be expected value resolved to by called function'
    );
  });
})
.then(function basicUsage_noArgs_nextCallDuringPending() {
  const timeouts = createTimeoutFns();
  const queue = createAsyncQueue();
  const debounce = createDebounceTrailingWithAsyncReplacement({
    setTimeout: timeouts.setTimeout,
    clearTimeout: timeouts.clearTimeout,
  });
  let resolutions = 0;
  const fn = () => queue.enqueue().then((v) => { resolutions += 1; return v; });
  const debounced = debounce(fn, 500);

  const promise1 = debounced();

  timeouts.advanceTime(500);

  assert.equal(
    resolutions, 0,
    'Nothing should resolve on timeout (timeout should be async)'
  );

  assert.equal(
    timeouts.pending.length, 0,
    'There should be 0 timeouts after debounce time has elapsed'
  );

  assert.equal(
    queue.queue.length, 1,
    'After timeout, the async call should be executed'
  );

  const promise2 = debounced();

  assert.equal(
    promise1, promise2,
    'A second call made when the timeout of the first call has elapsed but not yet settled should result in the same promise'
  );

  assert.equal(
    timeouts.pending.length, 1,
    'There should be 1 timeout after a second call is made'
  );

  timeouts.advanceTime(500);

  assert.equal(
    timeouts.pending.length, 0,
    'There should be 0 timeouts after second debounce time has elapsed'
  );

  assert.equal(
    queue.queue.length, 2,
    'A second call made when the first call has not yet settled should result in a separate actual call'
  );

  assert.equal(
    resolutions, 0,
    'Nothing should resolve on timeout (timeout should be async)'
  );

  queue.resolveNext('first');
  queue.resolveNext('second');

  return promise2.then((res) => {
    assert.equal(
      resolutions, 2,
      'After all resolutions, there should be 2 counted resolutions'
    );

    assert.equal(
      res, 'second',
      'Promise should settle with the settlement last-most call'
    );
  });
})
.then(function basicUsage_noArgs_clear_timeout() {
  const timeouts = createTimeoutFns();
  const queue = createAsyncQueue();
  const debounce = createDebounceTrailingWithAsyncReplacement({
    setTimeout: timeouts.setTimeout,
    clearTimeout: timeouts.clearTimeout,
  });
  let resolutions = 0;
  const fn = () => queue.enqueue().then((v) => { resolutions += 1; return v; });
  const debounced = debounce(fn, 500);

  const promise1 = debounced();

  assert.doesNotThrow(() => {
    debounced.clear();
  },
    'debounced.clear() should not error on call'
  );

  assert.equal(
    timeouts.pending.length, 0,
    'There should be 0 timeouts after debounced.clear() is called'
  );

  timeouts.advanceTime(500);

  assert.equal(
    queue.queue.length, 0,
    'There should be 0 enqueued async operations after debounced.clear() is called, even after the timeout would have elapsed'
  );
})
.then(function basicUsage_noArgs_clear_promise() {
  const timeouts = createTimeoutFns();
  const queue = createAsyncQueue();
  const debounce = createDebounceTrailingWithAsyncReplacement({
    setTimeout: timeouts.setTimeout,
    clearTimeout: timeouts.clearTimeout,
  });
  let resolutions = 0;
  const fn = () => queue.enqueue().then((v) => { resolutions += 1; return v; });
  const debounced = debounce(fn, 500);

  const promise1 = debounced();

  timeouts.advanceTime(500);

  assert.equal(
    queue.queue.length, 1,
    'There should be 1 enqueued async operation after the timeout would have elapsed'
  );

  assert.doesNotThrow(() => {
    debounced.clear();
  },
    'debounced.clear() should not error on call'
  );

  assert.equal(
    queue.queue.length, 1,
    'debounced.clear() cannot cancel async operations'
  );

  const promise2 = debounced();

  assert.notEqual(
    promise1, promise2,
    'after debounced.clear(), a new promise should be returned by subsequent invocations of debounced()'
  );

  timeouts.advanceTime(500);

  queue.resolveNext('first');
  queue.resolveNext('second');

  return promise2.then(res => {
    assert.equal(
      res, 'second',
      'Should resolve to the second value'
    );
  }).then(() => Promise.race([
    promise1,
    Promise.resolve('third'),
  ])).then(res => {
    assert.equal(
      res, 'third',
      'First promise should never resolve despite underlying async operation resolving'
    );
  });
})
.then(function callbacksUsage() {
  const timeouts = createTimeoutFns();
  const queue = createAsyncQueue();
  const debounce = createDebounceTrailingWithAsyncReplacement({
    setTimeout: timeouts.setTimeout,
    clearTimeout: timeouts.clearTimeout,
  });
  let resolutions = 0;
  const fn = () => queue.enqueue();
  const debounced = debounce(
    fn, 500,
    function onResolve() {
      resolutions += 1;
    }
  );

  const promise1 = debounced();

  timeouts.advanceTime(500);
  queue.resolveNext('yay');

  return promise1.then(res => {
    assert.equal(
      res, 'yay',
      'should resolve with expected value'
    );

    assert.equal(
      resolutions, 1,
      'handler should have been called'
    );
  });
})
.then(function callbacksUsage_twoCalls() {
  const timeouts = createTimeoutFns();
  const queue = createAsyncQueue();
  const debounce = createDebounceTrailingWithAsyncReplacement({
    setTimeout: timeouts.setTimeout,
    clearTimeout: timeouts.clearTimeout,
  });
  let resolutions = 0;
  const fn = () => queue.enqueue();
  const debounced = debounce(
    fn, 500,
    function onResolve() {
      resolutions += 1;
    }
  );

  const promise1 = debounced();

  timeouts.advanceTime(500);

  const promise2 = debounced();

  assert.equal(
    promise1, promise2,
    'A second call made when the timeout of the first call has elapsed but not yet settled should result in the same promise'
  );

  timeouts.advanceTime(500);

  queue.resolveNext('first');
  queue.resolveNext('second');

  return promise2.then(res => {
    assert.equal(
      res, 'second',
      'should resolve with expected value'
    );

    assert.equal(
      resolutions, 1,
      'handler should have been called only once'
    );
  });
})
.then(() => {
  console.log('Pass!');
  process.exit(0);
})
.catch(error => {
  console.error('A test failed:');
  console.error(error);
  process.exit(1);
})
;
