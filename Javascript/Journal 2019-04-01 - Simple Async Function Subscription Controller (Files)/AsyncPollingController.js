function defaultSetTimeout(handler, timeout, ...args) {
  return window.setTimeout(handler, timeout, ...args);
}

function defaultClearTimeout(timeoutId) {
  return window.clearTimeout(timeoutId);
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
   * @param {number} options.timeout Timeout in ms between each call to the poll function.
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

    if (! Number.isFinite(options.timeout) || options.timeout < 0) {
      // I mean, you can pass 0, but you shouldn't.
      throw new Error('options.timeout must be a non-negative number');
    }

    const subscriptionId = this._subscriptionId++;
    const subscription = {
      id: subscriptionId,
      poll: fn,
      timeout: options.timeout,
      pollImmediately: options.pollImmediately === true ? true : false,
      timeoutId: null,
      pollPromise: null,
    };

    this._subscriptions.set(subscriptionId, subscription);

    if (subscription.pollImmediately) {
      this.poll(subscriptionId);
    }
    else {
      this._schedule(subscriptionId);
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
  poll(subscriptionId) {
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
        const result = await subscription.poll();
        this._handleResolution(subscriptionId, pollPromise, result);
      }
      catch (error) {
        this._handleRejection(subscriptionId, pollPromise, error);
      }
    })();

    subscription.pollPromise = pollPromise;
  }

  _handleResolution(subscriptionId, pollPromise, result) {
    const subscription = this._subscriptions.get(subscriptionId);

    if (! subscription) return;
    if (subscription.pollPromise !== pollPromise) return;

    subscription.pollPromise = null;
    this._schedule(subscriptionId);
  }

  _handleRejection(subscriptionId, pollPromise, error) {
    const subscription = this._subscriptions.get(subscriptionId);

    if (! subscription) return;
    if (subscription.pollPromise !== pollPromise) return;

    subscription.pollPromise = null;
    this._schedule(subscriptionId);
  }

  _schedule(subscriptionId) {
    const subscription = this._subscriptions.get(subscriptionId);

    if (! subscription) return;

    // Just in case...
    if (subscription.timeoutId != null) {
      this._clearTimeout(subscription.timeoutId);
      subscription.timeoutId = null;
    }

    subscription.timeoutId = this._setTimeout(
      () => this._executeScheduledPoll(subscriptionId),
      subscription.timeout
    );
  }

  _executeScheduledPoll(subscriptionId) {
    const subscription = this._subscriptions.get(subscriptionId);

    if (! subscription) return;

    subscription.timeoutId = null;
    this.poll(subscriptionId);
  }
}
