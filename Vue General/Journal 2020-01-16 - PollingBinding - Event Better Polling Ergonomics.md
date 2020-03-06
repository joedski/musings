Journal 2020-01-16 - PollingBinding - Event Better Polling Ergonomics
=======

Along with [better request ergonomics](./Journal%202019-11-08%20-%20Keyed%20Requests%20and%20Ergonomic%20Usage.md), it'd be nice to have the main drudgery around setting up periodic polling of requests also wrapped up with a bow.

Considerations:

- There is an existing polling controller, though I suppose it should technically not matter what underlying controller is used.
- The existing one is annoying to use and manual and fiddly, but I guess that can be said about raw Vuex module interfaces, too.  That's kinda why all these binding classes came about.
- Proper clean up of subscriptions requires tying into component lifecycle hooks.
    - Given how many things need to tie into that, a generalized solution may be better.
    - Any generalized solution is basically a specific bodge to do the things that the Composition API already does in an odd manner, and is only proposed because all our code is not using the Composition API and that's (as of 2020-01-16) not received an official release yet.



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

Better would maybe be to just suck it up and attach it to the prototype.  Or override the Vue constructor to slip it in just after `super()`.  Very hacky either way.

Another option might be to have things dynamically push their hook registrations onto an array as they're made, and have the global mixin just check for and walk the array in each hook.

```js
function registerLifecycleHooks(vm, hooks) {
    vm.$lifecycleHooks = vm.$lifecycleHooks || [];
    vm.$lifecycleHooks.push(hooks);
}

function createMixinHooks(...hookNames) {
    const hookDefs = {};
    hookNames.forEach(name => {
        // Done just to give the hook function the same name.
        hookDefs[name] = {
            [name](...args) {
                if (! this.$lifecycleHooks) return;
                this.$lifecycleHooks.forEach(hooks => {
                    if (typeof hooks[name] !== 'function') return;
                    hooks[name].apply(this, args);
                });
            },
        }[name];
    });
    return hookDefs;
}

const DynamicLifecycleHooksMixin = createMixinHooks(
    // not that you can readily access this one without
    // overriding the constructor or something.
    'beforeCreate',
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
);
```

Quite simple.
