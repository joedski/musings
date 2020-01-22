Journal 2020-01-16 - PollingBinding - Event Better Polling Ergonomics
=======

Along with [better request ergonomics](./Journal%202019-11-08%20-%20Keyed%20Requests%20and%20Ergonomic%20Usage.md), it'd be nice to have the main drudgery around setting up periodic polling of requests also wrapped up with a bow.

Considerations:

- There is an existing polling controller, though I suppose it should technically not matter what underlying controller is used.
- The existing one is annoying to use and manual and fiddly.
- Proper clean up of subscriptions requires tying into component lifecycle hooks.
    - Given how many things need to tie into that, a generalized solution may be better.
    - Any generalized solution is basically a specific bodge to do the things that the Composition API already does, and is only proposed because all our cose is not using it and it's (as of 2020-01-16) not received an official release yet.



## Dynamic Lifecycle Hook Integration

I imagine it might look something like this:

```js
function createMixinHooks(...hookNames) {
    const hookDefs = {};
    hookNames.forEach(name => {
        // Done just to give the hook function the same name.
        hookDefs[name] = {
            [name](...args) {
                this.$lifecycleHooks.executeHooks(name, args);
            },
        }[name];
    });
    return hookDefs;
}

const DynamicLifecycleHooksMixin = {
    beforeCreate() {
        this.$lifecycleHooks = {
            hooks: {},
            add: (hookName, handler) => {
                if (! Array.isArray(this.$lifecycleHooks.hooks[hookName])) {
                    this.$lifecycleHooks.hooks[hookName] = [];
                }

                this.$lifecycleHooks.hooks[hookName].push(handler);
            },
            executeHooks: (hookName, args) => {
                const hooks = this.$lifecycleHooks.hooks[hookName];
                if (! Array.isArray(hooks)) {
                    return;
                }
                hooks.forEach(callback => callback.apply(this, args));
            }
        };
    },

    ...createMixinHooks(
        // NOTE: 'beforeCreate' is not available in this implementation!
        'created',
        'beforeMount',
        'mounted',
        'beforeUpdate',
        'updated',
        'activated',
        'deactivated',
        'beforeDestroy',
        'destroyed',
        'errorCaptured',
    ),
};
```

Better would probably be to just suck it up and attach it to the prototype.  Or override the Vue constructor to slip it in just after `super()`.  Very hacky either way.
