Reselect but with ES6 Proxies
=============================

> Spoiler: [Someone already wrote this](https://www.npmjs.com/package/memoize-state)

In Vue 3, the major change will be the rewriting of the internals to use ES6 Proxies, which will make things significantly more performant than manually replacing every property with a `get`/`set` property.  Could we create a memoizer that uses this sort of proxied property access modality found in the likes of Vue and MobX?

Suppose we want to cache some derived value calculation on a React component:

```js
class Foo extends React.PureComponent {
  getFilteredStuff = createSelector(
    [
      ({ props }) => props.foo,
      ({ state }) => state.bar,
    ],
    (foo, bar) => someHeavyCalculation(foo, bar)
  // Pass the component itself as the first argument rather than the context argument.
  ).bind(null, this)
}
```

Ideally, we want to be able to write the memoized function like we would any simple value calculation function, ala Vue's Computed Value functions:

```js
proxyMemoize((arg) => {
  return arg.foo.bar + complexThing(arg.baz, arg.otherThing);
})
```

Or, we could have one that just assumes `this` is the target, or at least assumes `this` is a potential target and automatically proxifies that, too:

```js
class Foo extends React.PureComponent {
  getFilteredStuff = proxyMemoize(function $getFilteredStuff() {
    return someHeavyCalculation(this.props.foo, this.state.bar);
  })

  render() {
    const filteredStuff = this.getFilteredStuff();
    // ...
  }
}
```

I think it'd work just fine with other selectors, too; in fact, it'd avoid the major pit fall that plagues most newcomers to Reselect, putting other selectors within the selector-computor body.  Rather than making that a problem, this reverts that to being the natural interfacing method:

```js
// Objects/Arrays are covered by proxies.
// Primitives are as is.
const getTheThing = reselectProxy(function $getTheThing(state, arg) {
  const foo = somePlainSelector(state);
  const bar = someOtherPlainSelector(state, arg);
  return someHeavyCalculation(foo, bar);
})
```

I suppose for a bit more control, you could return a thunk.

```js
const getTheThing = reselectProxyThunk(function $getTheThing(state, arg) {
  const foo = somePlainSelector(state);
  const bar = someOtherPlainSelector(state, arg);
  // The actual calculation is only carried out if
  // the values accessed on state or arg change.
  return () => someHeavyCalculation(foo, bar);
})
```

So, if any accessed paths or accessed values change, it calls the thunk and stores that value.  Otherwise it just returns the previous value.

I guess the question is: given that the only way an argument could dynamically change is if either some underlying value changes, or if some value at another path changes, do we really need to use the thunk as another layer of indirection?  Vue seems to do just fine without it.  We could probably do just fine, too.

So `reselectProxy` is probably good enough.

Of course, [someone already wrote this](https://www.npmjs.com/package/memoize-state).
