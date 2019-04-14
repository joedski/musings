interface ISubscription {
  id: number;
  poll: () => any;
  // timeout?: number;
  timeoutIterator: Iterator<number>;
  pollImmediately: boolean;
  timeoutId: number | null;
  pollPromise: Promise<any> | null;
}

export interface IPollOptions {
  lastPollWasManual: boolean;
}

function defaultSetTimeout<TArgs extends any[]>(
  handler: (...args: TArgs) => any,
  timeout: number,
  ...args: TArgs
): number {
  return window.setTimeout(handler, timeout, ...args);
}

function defaultClearTimeout(timeoutId: number): void {
  return window.clearTimeout(timeoutId);
}

function *constantGenerator(n: number) {
  while (true) {
    yield n;
  }
}

export class AsyncPollingController {
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
    this.setTimeout = options.setTimeout || defaultSetTimeout;
    this.clearTimeout = options.clearTimeout || defaultClearTimeout;
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
       * Either a number representing the ms of the timeout,
       * or a Generator Function that yields numbers representing the ms of the timeout.
       * The Generator Function is called when the subscription is created, and the resultant
       * Iterator is used through out the life time of the subscription.
       * The timeout is set after resolution or rejection of the last call to the poll function,
       * so the actual time between calls may be longer than the specified timeout value.
       */
      timeout: number | (() => Iterator<number>);
      pollImmediately?: boolean;
    }
  ): number {
    if (typeof fn !== 'function') {
      throw new Error('Cannot subscribe to non-function');
    }

    const timeoutIterator = (() => {
      if (typeof options.timeout === 'function') {
        return options.timeout();
      }

      // I mean, you can pass 0, but you shouldn't.
      if (typeof options.timeout === 'number' && options.timeout >= 0) {
        return constantGenerator(options.timeout);
      }

      throw new Error('options.timeout must be either a non-negative number or a generator function yielding non-negative numbers');
    })();
    const subscriptionId = this.nextSubscriptionId++;
    const subscription: ISubscription = {
      id: subscriptionId,
      poll: fn,
      timeoutIterator,
      pollImmediately: options.pollImmediately === true ? true : false,
      timeoutId: null,
      pollPromise: null,
    };

    this.subscriptions.set(subscriptionId, subscription);

    if (subscription.pollImmediately) {
      this.poll(subscriptionId, { lastPollWasManual: false });
    }
    else {
      this.schedule(subscriptionId, { lastPollWasManual: false });
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
   * @param options.lastPollWasManual Optional param indicating that the call to `#poll()` was manual.  @default true
   * @return {void}
   */
  public poll(subscriptionId: number, { lastPollWasManual = true }: Partial<IPollOptions> = {}) {
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
      .then(() => this.handleResolution(subscriptionId, pollPromise, { lastPollWasManual }))
      .catch(() => this.handleRejection(subscriptionId, pollPromise, { lastPollWasManual }))
      ;

    subscription.pollPromise = pollPromise;
  }

  protected handleResolution(
    subscriptionId: number,
    pollPromise: Promise<any>,
    options: { lastPollWasManual: boolean }
  ) {
    const subscription = this.subscriptions.get(subscriptionId);

    if (!subscription) { return; }
    if (subscription.pollPromise !== pollPromise) { return; }

    subscription.pollPromise = null;
    this.schedule(subscriptionId, options);
  }

  protected handleRejection(
    subscriptionId: number,
    pollPromise: Promise<any>,
    options: { lastPollWasManual: boolean }
  ) {
    const subscription = this.subscriptions.get(subscriptionId);

    if (!subscription) { return; }
    if (subscription.pollPromise !== pollPromise) { return; }

    subscription.pollPromise = null;
    this.schedule(subscriptionId, options);
  }

  protected schedule(subscriptionId: number, options: { lastPollWasManual: boolean }) {
    const subscription = this.subscriptions.get(subscriptionId);

    if (!subscription) { return; }

    // Just in case...
    if (subscription.timeoutId != null) {
      this.clearTimeout(subscription.timeoutId);
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

    subscription.timeoutId = this.setTimeout(
      () => this.executeScheduledPoll(subscriptionId),
      Math.max(0, nextTimeout)
    );
  }

  protected executeScheduledPoll(subscriptionId: number) {
    const subscription = this.subscriptions.get(subscriptionId);

    if (!subscription) { return; }

    subscription.timeoutId = null;
    this.poll(subscriptionId, { lastPollWasManual: false });
  }
}

export default new AsyncPollingController();
