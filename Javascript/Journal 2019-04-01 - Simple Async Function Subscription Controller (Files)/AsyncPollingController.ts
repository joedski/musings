interface ISubscription {
  id: number;
  poll: () => any;
  timeout: number;
  pollImmediately: boolean;
  timeoutId: number | null;
  pollPromise: Promise<any> | null;
}

class AsyncPollingController {
  protected nextSubscriptionId: number;
  protected subscriptions: Map<number, ISubscription>;
  protected setTimeout: (fn: () => any, timeout: number, ...args: any[]) => number;
  protected clearTimeout: (timeoutId: number) => void;

  /**
   * Create a new AsyncPollingController.
   * @param  {Object} options @optional Optional options.
   * @param {(fn: () => any, timeout: number) => number} options.setTimeout @optional setTimeout implementation.
   *                                      @default window.setTimeout
   * @param {(timeoutId: number) => void} options.clearTimeout @optional clearTimeout implementation.
   *                             @default  window.clearTimeout
   */
  constructor(
    options: {
      setTimeout?: (fn: () => any, timeout: number, ...args: any[]) => number;
      clearTimeout?: (timeoutId: number) => void;
    } = {}
  ) {
    this.nextSubscriptionId = 1;
    this.subscriptions = new Map();
    this.setTimeout = options.setTimeout || window.setTimeout;
    this.clearTimeout = options.clearTimeout || window.clearTimeout;
  }

  /**
   * Create a new polling subscription.
   * @param  {Function} fn      Function to poll periodically.  Can be sync or async.
   * @param  {Object}   options Options.
   * @param {number} options.timeout Timeout in ms between each call to the poll function.
   *                                 The timeout is set after resolution or rejection of the last call to the poll function,
   *                                 so the actual time between calls may be longer than the specified timeout value.
   * @param {boolean} options.pollImmediately @optional Whether or not to call the poll function
   *                                          immediately on creation of the subscription.
   * @return {number}           Subscription Id.
   */
  public subscribe(
    fn: () => any,
    options: {
      /**
       * Timeout in ms between each call to the poll function.
       * The timeout is set after resolution or rejection of the last call to the poll function,
       * so the actual time between calls may be longer than the specified timeout value.
       */
      timeout: number;
      onPoll?: () => any;
      onResolve?: (resolution: any) => any;
      onReject?: (rejection: any) => any;
      pollImmediately?: boolean;
    }
  ): number {
    if (typeof fn !== 'function') {
      throw new Error('Cannot subscribe to non-function');
    }

    if (!Number.isFinite(options.timeout) || options.timeout < 0) {
      // I mean, you can pass 0, but you shouldn't.
      throw new Error('options.timeout must be a non-negative number');
    }

    const subscriptionId = this.nextSubscriptionId++;
    const subscription: ISubscription = {
      id: subscriptionId,
      poll: fn,
      timeout: options.timeout,
      pollImmediately: options.pollImmediately === true ? true : false,
      timeoutId: null,
      pollPromise: null,
    };

    this.subscriptions.set(subscriptionId, subscription);

    if (subscription.pollImmediately) {
      this.poll(subscriptionId);
    }
    else {
      this.schedule(subscriptionId);
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
  public unsubscribe(subscriptionId: number) {
    const subscription = this.subscriptions.get(subscriptionId);

    if (!subscription) { return; }

    if (subscription.timeoutId != null) {
      this.clearTimeout(subscription.timeoutId);
      subscription.timeoutId = null;
    }

    this.subscriptions.delete(subscriptionId);
  }

  /**
   * Cancel all subscriptions.
   * @return {void}
   */
  public unsubscribeAll() {
    this.subscriptions.forEach((subscription, id) => {
      this.unsubscribe(id);
    });
  }

  /**
   * Check if a subscription of a given ID exists.
   * @param  {number}  subscriptionId ID of the subscription to check.
   * @return {Boolean}                Whether or not a subscription of the given ID exists.
   */
  public hasSubscription(subscriptionId: number): boolean {
    return this.subscriptions.has(subscriptionId);
  }

  /**
   * Call a subscription's polling function then schedule another call for later.
   * If called before a previous call to the poll function has resolved or rejected,
   * the new call will take precedence.
   * @param  {number} subscriptionId ID of the subscription to poll.
   * @return {void}
   */
  public poll(subscriptionId: number) {
    const subscription = this.subscriptions.get(subscriptionId);

    if (!subscription) { return; }

    // Polling immediately will reset the timer.
    if (subscription.timeoutId != null) {
      this.clearTimeout(subscription.timeoutId);
      subscription.timeoutId = null;
    }

    // Into the event loop aether with ye.
    const pollPromise = Promise.resolve().then(subscription.poll);

    // Done afterwards so TS doesn't complain about a value initialization referencing itself.
    pollPromise
      .then(() => this.handleResolution(subscriptionId, pollPromise))
      .catch(() => this.handleRejection(subscriptionId, pollPromise))
      ;

    subscription.pollPromise = pollPromise;
  }

  protected handleResolution(subscriptionId: number, pollPromise: Promise<any>) {
    const subscription = this.subscriptions.get(subscriptionId);

    if (!subscription) { return; }
    if (subscription.pollPromise !== pollPromise) { return; }

    subscription.pollPromise = null;
    this.schedule(subscriptionId);
  }

  protected handleRejection(subscriptionId: number, pollPromise: Promise<any>) {
    const subscription = this.subscriptions.get(subscriptionId);

    if (!subscription) { return; }
    if (subscription.pollPromise !== pollPromise) { return; }

    subscription.pollPromise = null;
    this.schedule(subscriptionId);
  }

  protected schedule(subscriptionId: number) {
    const subscription = this.subscriptions.get(subscriptionId);

    if (!subscription) { return; }

    // Just in case...
    if (subscription.timeoutId != null) {
      this.clearTimeout(subscription.timeoutId);
      subscription.timeoutId = null;
    }

    subscription.timeoutId = this.setTimeout(
      () => this.executeScheduledPoll(subscriptionId),
      subscription.timeout
    );
  }

  protected executeScheduledPoll(subscriptionId: number) {
    const subscription = this.subscriptions.get(subscriptionId);

    if (!subscription) { return; }

    subscription.timeoutId = null;
    this.poll(subscriptionId);
  }
}
