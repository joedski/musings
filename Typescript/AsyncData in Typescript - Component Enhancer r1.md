AsyncData in Typescript - Component Enhancer r1
===============================================

Okay, trying again.  Things have gotten a bit messy, semi-working type wise, even if the implementation does work as expected.



## Normalizing Config

I'm going to start with the config, since that's pretty important to everything else working.  Specifically, I want the config to properly normalize.

To start, erase all types (just like TS does...!).  That done, let's poke `normalizeConfigProp` until the desired types are there.


### Using Classes to Wrap Normalization

I wonder if just front loading the normalization would be better...

```js
const enhance = withAsyncData<OwnProps>(c => (c
  .prop('getFoo', (ownProps: OwnProps) => () => fetch(api().getFoo(ownProps.fooId)))
  .prop('getBar', {
    request: (ownProps: OwnProps) => (barId: string) => fetch(api().getBarOfFoo(ownProps.fooId, barId)),
    reduce: (
      prevPropValue: { [k: string]: AsyncData<Bar, Error> },
      nextResValue: AsyncData<Bar, Error>,
      ownProps: OwnProps,
      [barId]: [string],
    ) => ({
      ...prevPropValue,
      [barId]: nextResValue,
    }),
    initial: (initOwnProps: OwnProps) => ({} as { [k: string]: AsyncData<Bar, Error> })
  })
))
```

More control, at the cost of a weird Non-JSish looking API.  Bluh.

Wouldn't fix the `keyof`-non-assignability issues, though.
