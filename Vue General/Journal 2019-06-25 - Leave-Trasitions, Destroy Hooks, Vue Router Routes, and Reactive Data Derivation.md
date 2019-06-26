Journal 2019-06-25 - Leave-Trasitions, Destroy Hooks, Vue Router Routes, and Reactive Data Derivation
========

There are two somewhat related issues I'm dealing with here:

1. A Component derives data reactively from `this.$route` but a route change would cause it to transition out.  Since the route changes, this leads to different data temporarily being shown in the Component Template during the leave transition.
2. A Component derives data reactively from `this.$route` but needs to access this data in the `beforeDestroy()` hook.  Since the route changes, frequently going from having something to having nothing, the derived data also disappears.

Obviously, we can't just replace `this.$route` completely, because in the majority of cases it's fine:

- Most of the time we're not actually worrying about transitions,
- And most of the rest of the time we're not actually changing routes even with transitions.

The easiest way would be if, upon a component being transitioned out, its own `this.$route` binding was frozen to the previous value.  However, this fails on a few fronts:

1. We'd have to somehow interdict the binding setup by Vue Router.
2. Route changes lead to Transitions, not the other way around, although this is probably trivially worked around by just keep the Last Route around.
3. A component would have to know, arbitrarily deep in the Component Hierarchy, when it's being transitioned out.

1 and 3 seem like real non-starters and, in my current project at least, the vast majority of components don't need to worry about this.  However, I could see this becoming an issue if we decided we wanted pervasive page transitions.  It doesn't seem like that's in the cards on the current app, but it's likely something I'll run into later, and definitely something that's given me pause in the past.



## Present Cases

So far, I think I've only run into a single case:

- I need to clean up something in `beforeDestroy()` based on the current Entity ID pulled from the Route, but because the Route has already changed so as to actually lead to `beforeDestroy()` being called, the Entity ID usually is no longer present.

I think that by far will be the most common case I tend to encounter.


### Proposal 1: Keep Last Non-Nil

I think this could be solved somewhat handily if I use something along the lines of a Keep Last Non-Nil type deal: A Derived Behavior whose value is the Last Non-Nil Value of the base Behavior.  That keeps things nice and reactive while still allowing for value changes in cases where that's a thing as, usually, anything where I'm actually worried about this happening is something where the component is going away due to the value itself going away.

Of course, Vue is not FRP, so how to do this here?

#### Proposal 1 Implementation 1: Scanned Prop

Well, a Scanned Prop would certainly do:

```js
export default {
    scanned: {
        entityId: scannedProp.keepLastNonNil(),
    },

    beforeCreate() {
        this.$watch(
            () => this.$route.entityId,
            next => this.$scanned.next('entityId', next)
        );
    },
};
```

But I don't have the wherewithall to make a Component Decorator for that, and the current Scanned Prop spec I have in mind doesn't really acommodate a common scenario: deriving straight off other props.  So, what's the easiest way to set that up besides?

#### Proposal 1 Implementation 2: Just Use a Controller?

Just create a controller object that exposes the following interface:
- `value: T` Reactive prop of the appropriate type.
- `next: (v: U) => T` Update value by scanning the next value.
- `reset: () => T` Reset value to the initial value.

Obvious, unfancy.

Where to do this?  Dunno.  In Vue Class Component, maybe like this?

```js
export default class Foo extends Vue {
    entityId = scanned.keepLastNonNil(
        () => castToFiniteNumberOrNull(this.$route.params.entityId)
    );

    get thingDerivedFromEntityId() {
        if (this.entityId.value != null) {
            return this.$store.state.entities[this.entityId.value];
        }
        return null;
    }
}
```

In Vue Object Component form, it'd be like this:

```js
export default {
    data() {
        return {
            entityId: scanned.keepLastNonNil(
                () => castToFiniteNumberOrNull(this.$route.params.entityId)
            ),
        };
    },

    computed: {
        thingDerivedFromEntityId() {
            if (this.entityId.value != null) {
                return this.$store.state.entities[this.entityId.value];
            }
            return null;
        },
    },
};
```

We'd just depend on the Vue runtime to reactify `this.entityId.current` while leaving `this.entityId.next` and `this.entityId.reset` alone.

I guess that could be guaranteed by creating the controller like this:

```js
// Vue automatically skips anything beginning with $.
const scannedPropProto = {
  $next(v) {
    this.value = this.$scan(this.value, v);
    return this.value;
  },
  $reset() {
    this.value = this.$init();
    return this.value;
  },
};

function scanned(vm, init, scan) {
  return Object.assign(
    Object.create(scannedPropProto),
    {
      value: init.call(vm),
      $init: init.bind(vm),
      $scan: scan.bind(vm),
    }
  );
}
```

If we want to use that in the `data()` call, we'd have to do something like this:

```js
function scannedFromWatch(vm, watchFn, init, scan) {
  const $prop = scanned(vm, init, scan);

  // Has to be setup next tick because we're (probably)
  // in the data() call.
  // Would probably be better to have some sort of utility
  // that can collect them then add all the watches
  // in the created() hook.
  vm.$nextTick(() => {
    vm.$watch(watchFn, (next) => {
      $prop.$next(next);
    });
  });

  return $prop;
}
```

But then we could define `keepLastNonNil` like so:

```js
function keepLastNonNil(vm, watchFn) {
    return scannedFromWatch(vm, watchFn,
        () => null,
        (value, next) => {
            if (next != null) return next;
            return value;
        }
    );
}
```
