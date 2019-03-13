Journal 2019-03-12 - Self Referential Function Maps
===================================================

Experiments trying to get this to work:

```
//    vvvvvv This has the same type...
const fnsMap = magic({
  //  vvvvvv as this...
  foo(fnsMap) { ... },
  //  vvvvvv and as this...
  bar(fnsMap, a, b) { ... },
});

// and that type is:
type FnsMap = {
  foo: (): ReturnType<FnsMap["foo"]>;
  bar: (a: A, b: B): ReturnType<FnsMap["bar"]>;
};
```

I'm not entirely sure it's possible in TS as of yet, or if it ever will be, but here's some attempts at it.

If I can figure out that, I should be able to do any case that requires other derivations of the self object type, allowing me to do something closer to the target use case of Vuex Store Module Definitions, so something like this more verisimilitudinous:

```
const mod = {
    state: {},
    getters: {},
    actions: {
        doFoo({ actions, getters }) {
            // ...
        }
    }
}
```



Freeform Objects That Are Still Constrained
-------------------------------------------

I know from looking at various things with Redux that you can apply constraints to an otherwise freeform object while also deriving a set interface by constraining an object to a different type that takes that object's inferred type as a parameter.

Basically, `TObj extends SomeMappedType<TObj>`.

This is used by React Redux HOCs to do some type enforcement, if I recall correctly.  This is certainly one thing to try, though of course it may ultimately not be necessary.
