function defaultSetTimeout(handler, timeout, ...args) {
  return window.setTimeout(handler, timeout, ...args);
}

function defaultClearTimeout(timeoutId) {
  return window.clearTimeout(timeoutId);
}

function *constantGenerator(n) {
  while (true) {
    yield n;
  }
}

class AsyncPollingController {
  /**
   * Create a new AsyncPollingController.
   * @param  {Object} options @optional Optional options.
   * @param {(fn: Function, timeout: number) => number} options.setTimeout @optional setTimeout implementation.
   *                                      @default window.setTimeout
   * @param {(timeoutId: number) => void} options.clearTimeout @optional clearTimeout implementation.
   *                             @default  window.clearTimeout
   */
  constructor(options = {}) {
    this._subscriptionId = 1;
    this._subscriptions = new Map();
    this._setTimeout = options.setTimeout || defaultSetTimeout;
    this._clearTimeout = options.clearTimeout || defaultClearTimeout;
  }

  /**
   * Create a new polling subscription.
   * @param  {Function} fn      Function to poll periodically.  Can be sync or async.
   * @param  {Object}   options Optional options.
   * @param {number | () => Iterator<number>} options.timeout Either a number representing the ms of the timeout,
   *                                 or a Generator Function that yields numbers representing the ms of the timeout.
   *                                 The Generator Function is called when the subscription is created, and the resultant
   *                                 Iterator is used through out the life time of the subscription.
   *                                 The timeout is set after resolution or rejection of the last call to the poll function,
   *                                 so the actual time between calls may be longer than the specified timeout value.
   * @param {boolean} options.pollImmediately @optional Whether or not to call the poll function
   *                                          immediately on creation of the subscription.
   * @return {number}           Subscription Id.
   */
  subscribe(fn, options = {}) {
    if (typeof fn !== 'function') {
      throw new Error('Cannot subscribe to non-function');
    }

    const timeoutIterator = (() => {
      if (typeof options.timeout === 'function') {
        return options.timeout();
      }

      // I mean, you can pass 0, but you shouldn't.
      if (typeof potions.timeout === 'number' && options.timeout >= 0) {
        return constantGenerator(options.timeout);
      }

      throw new Error('options.timeout must be either a non-negative number or a generator function yielding non-negative numbers');
    })();
    const subscriptionId = this._subscriptionId++;
    const subscription = {
      id: subscriptionId,
      poll: fn,
      timeoutIterator,
      pollImmediately: options.pollImmediately === true ? true : false,
      timeoutId: null,
      pollPromise: null,
    };

    this._subscriptions.set(subscriptionId, subscription);

    if (subscription.pollImmediately) {
      this.poll(subscriptionId, { lastPollWasManual: false });
    }
    else {
      this._schedule(subscriptionId, { lastPollWasManual: false });
    }

    return subscriptionId;
  }

  /**
   * Cancel a subscription.
   *
   * Note that if a subscription is cancelled after the poll function was called
   * but before it has resolved or rejected, the poll function will still resolve
   * or reject but the onResolve/onReject handlers will _not_ be called.
   * @param  {number} subscriptionId ID of the subscription to cancel.
   * @return {void}
   */
  unsubscribe(subscriptionId) {
    const subscription = this._subscriptions.get(subscriptionId);

    if (! subscription) return;

    if (subscription.timeoutId != null) {
      this._clearTimeout(subscription.timeoutId);
      subscription.timeoutId = null;
    }

    this._subscriptions.delete(subscriptionId);
  }

  /**
   * Cancel all subscriptions.
   * @return {void}
   */
  unsubscribeAll() {
    this._subscriptions.forEach((subscription, id) => {
      this.unsubscribe(id);
    });
  }

  /**
   * Check if a subscription of a given ID exists.
   * @param  {number}  subscriptionId ID of the subscription to check.
   * @return {Boolean}                Whether or not a subscription of the given ID exists.
   */
  hasSubscription(subscriptionId) {
    return this._subscriptions.has(subscriptionId);
  }

  /**
   * Call a subscription's polling function then schedule another call for later.
   * If called before a previous call to the poll function has resolved or rejected,
   * the new call will take precedence.
   * @param  {number} subscriptionId ID of the subscription to poll.
   * @return {void}
   */
  poll(subscriptionId, options = { lastPollWasManual: true }) {
    const subscription = this._subscriptions.get(subscriptionId);

    if (! subscription) return;

    // Polling immediately will reset the timer.
    if (subscription.timeoutId != null) {
      this._clearTimeout(subscription.timeoutId);
      subscription.timeoutId = null;
    }

    // Into the event loop aether with ye.
    const pollPromise = (async () => {
      try {
        // using await here normalizes behavior between sync and async functions.
        await subscription.poll();
        this._handleResolution(subscriptionId, pollPromise, options);
      }
      catch (_error) {
        this._handleRejection(subscriptionId, pollPromise, options);
      }
    })();

    subscription.pollPromise = pollPromise;
  }

  _handleResolution(subscriptionId, pollPromise, options) {
    const subscription = this._subscriptions.get(subscriptionId);

    if (! subscription) return;
    if (subscription.pollPromise !== pollPromise) return;

    subscription.pollPromise = null;
    this._schedule(subscriptionId, options);
  }

  _handleRejection(subscriptionId, pollPromise, options) {
    const subscription = this._subscriptions.get(subscriptionId);

    if (! subscription) return;
    if (subscription.pollPromise !== pollPromise) return;

    subscription.pollPromise = null;
    this._schedule(subscriptionId, options);
  }

  _schedule(subscriptionId, options) {
    const subscription = this._subscriptions.get(subscriptionId);

    if (! subscription) return;

    // Just in case...
    if (subscription.timeoutId != null) {
      this._clearTimeout(subscription.timeoutId);
      subscription.timeoutId = null;
    }

    const nextTimeoutResult = subscription.timeoutIterator.next(options);

    if (nextTimeoutResult.done) {
      this.unsubscribe(subscription.id);
    }

    const nextTimeout = nextTimeoutResult.value;

    // I mean, in our code base, it should always be a number, but it's still JS...
    if (typeof nextTimeoutResult.value !== 'number') {
      console.error(`Non-Number yielded from Iterator created by Timeout Generator of Subscription #${subscription.id}.  Cancelling subscription.`);
      this.unsubscribe(subscription.id);
    }

    if (! (nextTimeout >= 0)) {
      console.warn(`Non-positive number yielded from Iterator created by Timeout Generator of Subscription #${subscription.id}.  Treating as zero.`);
    }

    subscription.timeoutId = this._setTimeout(
      () => this._executeScheduledPoll(subscriptionId),
      Math.max(0, nextTimeout)
    );
  }

  _executeScheduledPoll(subscriptionId) {
    const subscription = this._subscriptions.get(subscriptionId);

    if (! subscription) return;

    subscription.timeoutId = null;
    this.poll(subscriptionId, { lastPollWasManual: false });
  }
}
