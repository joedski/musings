Event Bus and Bus Events
========================

A common pattern for app-wide event dispatch and reaction is the Event Bus, but registering listeners to that runs into problems:
- When Instances of the same Component register using one of their Methods, they can unregister listeners for each other.
- When Instances drop Event Bindings by name, they can unregister listeners for EVERYONE.

The proper solution is to therefor have each instance properly setup and dispose of such event listeners themselves, and to do so as automatically as possible.

Supposing there's an App-Wide Event Bus that gets attached to `this.$bus`.  What I'll do here is show a simple implementation of per-instance support for binding events through a controller attached to `this.$busEvents`.



## Considerations and Interface Musing

We should stick to the normal Vue Event Emitter API shape as much as possible.  This means `$on`, `$off`, `$once`, and `$emit`:

```
{
  $on(event: string | Array<string>, callback: (...args: any[]) => void);
  $once(event: string | Array<string>, callback: (...args: any[]) => void);
  $off();
  $off(event: string | Array<string>);
  $off(event: string | Array<string>, callback: (...args: any[]) => void);
  $emit(event: string, ...args: any[]);
}
```

> For the array arguments, I think it'll suffice to basically just do `event.forEach(singleEvent => $busEvents.$on(singleEvent), callback)`, same for `$once` and `$off`.

This will then need to be created per-Component-Instance, and perform initialization after `this.$bus` has been bound.

It will have to maintain its own registry of events, obviously, as these are listeners on the global event bus, but are meant to be tied to the lifetime of the given Instance.

Now, on the base Event Emitter, it seems (from looking at how some projects have hacked around this) that `emitter._events` is an Object that holds handlers per event name.  Maybe it's an Array or Set?  Who knows.  It's at the very least `{ [eventName: string]: SomeHandlerCollectionOrSomething }`.  If that's good enough for them, then that's good enough for me.

Now, I'm not going to use an actual Emitter in this case, too much baggage I don't know about, and I'm completely overriding the main methods anyway.  Thus, custom implementation it is.



## Implementation

Something like this should be pretty close:

```js
class EventBusInterconnect {
  constructor(vm) {
    this._vm = vm;
    this._events = {};
  }

  $on(eventName, callback) {
    if (typeof callback === 'string') {
      this.$on(eventName, this._vm[callback]);
      return;
    }

    if (Array.isArray(eventName)) {
      eventName.forEach(singleEventName =>
        this.$on(singleEventName, callback)
      );
      return;
    }

    const boundCallback = this._createBoundCallback(callback);

    this._bindEventListener(eventName, boundCallback);
  }

  $once(eventName, callback) {
    if (typeof callback === 'string') {
      this.$on(eventName, this._vm[callback]);
      return;
    }

    if (Array.isArray(eventName)) {
      eventName.forEach(singleEventName =>
        this.$once(singleEventName, callback)
      );
      return;
    }

    const boundCallback = this._createSelfUnbindingBoundCallback(eventName, callback);

    this._bindEventListener(eventName, boundCallback);
  }

  $off(eventName, callback) {
    if (eventName == null && callback == null) {
      this._unbindAll();
      return;
    }

    if (Array.isArray(eventName)) {
      eventName.forEach(singleEventName => {
        this.$off(singleEventName, callback);
      });
      return;
    }

    if (callback == null) {
      this._unbindAllOfName(eventName);
      return;
    }

    if (typeof callback === 'string') {
      if (this._vm[callback] === 'function') {
        this.$off(eventName, this._vm[callback]);
      }
      return;
    }

    this._unbindAllOfNameAndCallback(eventName, callback);
  }

  $emit(eventName, ...args) {
    // This is just a covenience passthrough.  Nothing fancy here.
    this._vm.$bus.$emit(eventName, ...args);
  }

  /**
   * Creates a properly bound callback.
   */
  _createBoundCallback(callback) {
    const boundCallback = Object.assign(
      (...args) => {
        callback.apply(this._vm, args);
      },
      {
        // Save the original callback so we can unbind by that.
        callback,
      }
    );

    return boundCallback;
  }

  /**
   * Creates a properly bound callback that unbinds itself
   * after being called once.
   *
   * NOTE: If you set a $once then later call $off with the same
   * underlying callback before the listened-for event is received,
   * this $once listener will also be unbound!
   */
  _createSelfUnbindingBoundCallback(eventName, callback) {
    const boundCallback = Object.assign(
      (...args) => {
        this._unbindBoundCallback(eventName, boundCallback);
        callback.apply(this._vm, args);
      },
      {
        // Save the original callback so we can unbind by that.
        callback,
      }
    );

    return boundCallback;
  }

  /**
   * Binds a single bound callback to a given event on the event bus.
   */
  _bindEventListener(eventName, boundCallback) {
    if (! Array.isArray(this._events[eventName])) {
      this._events[eventName] = [];
    }

    this._events[eventName].push(boundCallback);
    this._vm.$bus.$on(eventName, boundCallback);
  }

  /**
   * Unbinds all event listeners!
   */
  _unbindAll() {
    Object.keys(this._events).forEach(eventName => {
      this._unbindAllOfName(eventName);
    });
  }

  /**
   * Unbinds all event listeners for a given event name.
   */
  _unbindAllOfName(eventName) {
    if (this._events[eventName] == null) {
      return;
    }

    this._events[eventName].forEach(boundCallback => {
      this._vm.$bus.$off(eventName, boundCallback);
    });

    delete this_.events[eventName];
  }

  /**
   * Unbinds all bound callbacks for a given eventName whose
   * underlying callback matches the passed in callback.
   */
  _unbindAllOfNameAndCallback(eventName, callback) {
    if (this._events[eventName] == null) {
      return;
    }

    this._events[eventName]
      .filter(boundCallback => boundCallback.callback === callback)
      .forEach(boundCallback => {
        this._vm.$bus.$off(eventName, boundCallback);
      });

    this._events[eventName] = this._events[eventName]
      .filter(boundCallback => boundCallback.callback !== callback);
  }

  /**
   * This is like _unbindAllOfNameAndCallback except that it
   * compares by the bound callback itself rather than
   * the underlying callback.
   *
   * Only used by $once.
   */
  _unbindBoundCallback(eventName, boundCallback) {
    if (this._events[eventName] == null) {
      return;
    }

    this._events[eventName]
      .filter(boundCallbackOfEvent => boundCallbackOfEvent === boundCallback)
      .forEach(boundCallbackOfEvent => {
        this._vm.$bus.$off(eventName, boundCallbackOfEvent);
      })

    this._events[eventName] = this._events[eventName]
      .filter(boundCallbackOfEvent => boundCallbackOfEvent !== boundCallback)
  }
}
```

One caveat to note: A `$once` listener must unbind itself specifically, while calling `$off` with an event name and a given function should unbind all bound listeners with the same name and callback function, regardless of how many there are.  That is, unbinding semantics are different between `$once` and `$off`.

From here, when setting up your event bus, you can also attach a `$busEvents` instance to the component instance.  Something like this would work:

```js
function addInitialEventBinding(vm, eventName, eventConfig) {
  if (typeof eventConfig === 'function' || eventConfig === 'string') {
    vm.$busEvents.$on(eventName, eventConfig);
    return;
  }

  if (
    typeof eventConfig === 'object'
    && (typeof eventConfig.handler === 'function' || eventConfig.handler === 'string')
  ) {
    if (eventConfig.once === true) {
      vm.$busEvents.$once(eventName, eventConfig.handler);
    }
    else {
      vm.$busEvents.$on(eventName, eventConfig.handler);
    }

    return;
  }

  console.error(`BusEvents(${vm.$options.name || '[Anonymous Component]'}): Cannot bind handler for event ${eventName}: Unrecognized event config type`);
}

export default {
  beforeCreate() {
    // We can create this now because it doesn't actually do anything
    // up front; it always references this.$bus lazily.
    // This ties in with my own opinion that `beforeCreate`/`created`
    // are for things specific to the component itself
    // and `beforeMount`/`mounted` are for things when the component
    // can expect to start interacting with the rest of the app.
    // Especially `mounted`, since it now has been mounted to the DOM.
    // This also has implications for SSR.
    this.$busEvents = new EventBusInterconnect(this);
  },

  mounted() {
    const { busEvents } = this.$options;

    if (! busEvents) {
      return;
    }

    if (! this.$bus) {
      console.error(`BusEvents(${vm.$options.name || '[Anonymous Component]'}): Cannot bind handlers: Event bus not present at this.$bus`);
      return;
    }

    Object.keys(busEvents).forEach(eventName => {
      addInitialEventBinding(this, eventName, busEvents[eventName]);
    });
  },

  beforeDestroy() {
    // :)
    this.$busEvents.$off();
  },
}
```

Looks pretty good, probably some bugs to work out, but I think it expresses things pretty well.  One thing it could probably do with is some extra input validation, namely checking that you actually handed it a function or a valid method name.



## A Better Implementation by Tagging Callbacks?

I had another thought: we can simply tag a callback with what VM it originated from before setting it as a listener on the Global Event Bus.  Then we can simply remove only those listeners for this callback...

Hm.  That depends on actually tracking them at the top level, which presumes knowledge of how the events are stored.  Although we technically know that events are stored on the `_event` instance property, that's an internal prop subject to change.  We'll need a wrapper somewhere that tracks callbacks in a way we control.  That means either something at the top level or else something at each component instance, which is back to the above.  In that case, I'm not sure the global manager is better than the local one.
