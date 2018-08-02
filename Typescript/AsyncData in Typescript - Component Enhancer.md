AsyncData in Typescript - Component Enhancer
============================================



## Aside: What is `AsyncData<R, E>`?

So, given the complication in trying to define actual TS types for daggy, I'll probably go the route outlined in my Classes workout.  In any case, all we really care about is that we have defined interfaces for the things.



## Overview of Typing

For the enhancer itself, I'll need to be able to determine the types of the re-wrapped functions...  Fortunately, I've since learned [how to unbox types for reboxing](./Unboxing%20Types%20From%20Parametrized%20Boxes.md), so that's that part under my belt.

Given the need to add extra props based on inputs, it may be informative to see [how React-Redux defines their types](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/react-redux/index.d.ts#L75), along with [how they specify the polymorphic interface of their enhancer](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/react-redux/index.d.ts#L109).  It's a bit hairy.


### Aside: Multiple Results, One Prop Name

I noted somewhere else that if a getter fetch in this pattern can be parametrized on something, then simultaneous fetch calls will conflict.  The basic solution is to, in such cases, create a collection of item-results based on one of the parameters or the return value.  I think the easiest way to do that would be to expose the ability to specify the new-value-reduce behavior, the scanner function, basically.

For full flexibility, I think you'd need to be able to map things async, so you could say do `response.json()`, so return the new prop's value in a promise.  Or, hm.  That might cause issues if you have multiple things resolve simultaneously.  That'd require a two-step thing, I guess: async-map result and sync-reduce.  Then, it'd probably be easiest to just not allow async, and require async be done as part of the fetcher itself.

So, I guess the full interface would be:

```js
interface Reducer<T> {
  (prop: T, nextValue, argsArray): T;
}

interface FetcherGetter<> {
  (props) => Fetcher<>;
}

type FetcherDef<> =
  | FetcherGetter<>
  | {
    fetch: FetcherGetter<>;
    reduce: Reducer<>;
  }
```

Something like that.

The reducer would be called any time a status update occurs, so you can update based on that.  A common one might be:

```js
function r(prop, nextValue, argsArray) {
  return {
    ...prop,
    [argsArray[0]]: nextValue,
  };
}
```

In fact, probably the most common one would be that.

The Fetcher Getter is of course to allow the use of props, which includes use with React-Redux.

And, naturally for anything reduce-ish, we need an initial value.  This brings the full definition to:

```js
withAsyncData({
  foo: {
    // :: (props: Props) => (...args: Args) => Promise<V>
    getter: (props) => props.getFoo,
    // :: (prop: PropType<Def[K]>, nextValue: V, argsArray: Args) => PropType<Def[K]>
    reduce: (prop, nextValue, argsArray: Args) => ({
      ...prop,
      // Overwrite the previous value for the given sub-prop at argsArray[0].
      [argsArray[0]]: nextValue,
    }),
    // :: PropType<Def[K]>
    initialValue: () => ({}),
  }
})
```

It's probably fine to stipulate in the interface that if `reduce` is specified, `initialValue` is required, even if it's explicitly `undefined` or `null`.

The default config would be:

```js
const defaultConfig = {
  reduce: (prevPropValue, nextResolutionValue, argsArray) => nextResolutionValue,
  initialValue: () => AsyncData.NotAsked(),
};
```


### Actual Config Interface

```js
interface Config<OwnProps> {
  [propName: string]: PropConfig<OwnProps>;
}

type PropConfig<OwnProps, T> =
  | PropConfigFunction<OwnProps, T>
  | PropConfigGetterOnly<OwnProps, T>
  | PropConfigFull<OwnProps, T>
  ;

interface PropConfigFunction<OwnProps> {
  (ownProps: OwnProps): Promise<any>;
}

interface PropConfigGetterOnly<OwnProps> {
  getter: PropConfigFunction<OwnProps>;
}

interface PropConfigFull<OwnProps, T> extends PropConfigGetterOnly<OwnProps> {
  reduce(prevPropValue: T, nextResolutionValue: AsyncData<any>, argsArray: Array<any>): T;
  initialValue(): T;
}
```

Something like that.  We can't really get any more specific yet because we don't have the props.


### Use with React-Redux

Simplest solution:

```js
const connection = connect(
  mapStateToProps,
  function mapDispatchToProps(dispatch, props) {
    return {
      getFoo: () => dispatch(thunks.getFoo()),
      getBar: (id) => dispatch(thunks.getBarById(id)),
    };
  }
);
const addAsyncDataStatus = withAsyncDataStatus({
  foo: (props) => props.getFoo
});

const EnhancedComponent = compose(
  // Define underlying fetches here so they can dispatch, etc.
  connection,
  // Wrap functions here to handle async-data-status.
  addAsyncDataStatus,
)(BaseComponent);
```


### Typing the Props

Okay, how do we set the props?  Obviously, we need to return a component which has a reduced prop interface but wrap around one which has extra props injected. (And the wrapped component should know what it's going to receive)

So, basically, something like this:

```
<Base extends ReactComponent<any, any>>(base: Base) =>
  ReactComponent<PropsWithoutStatusesType<Base>, StateType<Base>>
```

Which means the outer thing is something like:

```
<C, E extends Enhancer<ReactComponent<{}, {}>>>(config: C) => E
```

Time to dig into what React-Redux did.

Not going to bother looking at anything more that the first couple interfaces, because they have a _bunch_.

```
export interface Connect {
    (): InferableComponentEnhancer<DispatchProp>;

    <TStateProps = {}, no_dispatch = {}, TOwnProps = {}, State = {}>(
        mapStateToProps: MapStateToPropsParam<TStateProps, TOwnProps, State>
    ): InferableComponentEnhancerWithProps<TStateProps & DispatchProp, TOwnProps>;

    <no_state = {}, TDispatchProps = {}, TOwnProps = {}>(
        mapStateToProps: null | undefined,
        mapDispatchToProps: MapDispatchToPropsParam<TDispatchProps, TOwnProps>
    ): InferableComponentEnhancerWithProps<TDispatchProps, TOwnProps>;

    <TStateProps = {}, TDispatchProps = {}, TOwnProps = {}, State = {}>(
        mapStateToProps: MapStateToPropsParam<TStateProps, TOwnProps, State>,
        mapDispatchToProps: MapDispatchToPropsParam<TDispatchProps, TOwnProps>
    ): InferableComponentEnhancerWithProps<TStateProps & TDispatchProps, TOwnProps>;

    // ... 8 more interfaces.
}
```

Note that `MapStateToPropsParam` is a union of the according Selector and Selector-Factory types, similarly for `MapDispatchToPropsParam`.

They use an `InferableComponentEnhancerWithProps<TStateProps & TDispatchProps, TOwnProps>`, which has [this definition](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/react-redux/index.d.ts#L75):

```
// Injects props and removes them from the prop requirements.
// Will not pass through the injected props if they are passed in during
// render. Also adds new prop requirements from TNeedsProps.
export interface InferableComponentEnhancerWithProps<TInjectedProps, TNeedsProps> {
	(
		component: StatelessComponent<TInjectedProps>
	): ComponentClass<TNeedsProps> & {WrappedComponent: StatelessComponent<TInjectedProps>}

	<P extends Shared<TInjectedProps, P>>(
		component: ComponentType<P>
	): ComponentClass<Omit<P, keyof Shared<TInjectedProps, P>> & TNeedsProps> & {WrappedComponent: ComponentType<P>}
}
```

Which itself makes use of [these utilities](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/react-redux/index.d.ts#L45):

```
// Diff / Omit taken from https://github.com/Microsoft/TypeScript/issues/12215#issuecomment-311923766
type Omit<T, K extends keyof T> = Pick<T, ({ [P in keyof T]: P } & { [P in K]: never } & { [x: string]: never, [x: number]: never })[keyof T]>;

// ...

/**
 * a property P will be present if :
 * - it is present in both DecorationTargetProps and InjectedProps
 * - DecorationTargetProps[P] extends InjectedProps[P]
 * ie: decorated component can accept more types than decorator is injecting
 *
 * For decoration, inject props or ownProps are all optionnaly
 * required by the decorated (right hand side) component.
 * But any property required by the decorated component must extend the injected property
 */
type Shared<
    InjectedProps,
    DecorationTargetProps extends Shared<InjectedProps, DecorationTargetProps>
> = {
    [P in Extract<keyof InjectedProps, keyof DecorationTargetProps>]?: DecorationTargetProps[P] extends InjectedProps[P] ? InjectedProps[P] : never;
};
```

I have a feeling I'll be employing something rather like these to add my magical props.  I'll also need to create some utilities, of course, mostly `tapBefore` and `tapAfter` to handle side effects.

The easiest way may be to just start writing the actual thing itself then abstracting over the possible inputs.



## Digging In: Implementation First

We'll start with the most explicit case: Fully Specified Config.  Everything else is just shorthands for that.


### Exposed Interface

As shown elsewhere, this will be used something like so:

```js
const enhanceWithAsyncDataStatus = withAsyncDataStatus({
  foo: {
    request: (ownProps) => () => ownProps.getFoo(),
    reduce: (prevPropValue, nextResValue, ownProps) => nextResValue,
    // NOTE: Initial value is a function which returns a new initial value when called.
    initialValue: (ownProps) => AsyncData.NotAsked(),
  },
})

export default enhanceWithAsyncDataStatus(BaseComponent)
```

It returns an enhancer with:

```
Enhancer<Config> =
  (BaseComponent<OwnProps & StatusProps<Config>, OwnState>)
    => Component<OwnProps, OwnState>
```


### Example Implementation

Obviously, there will likely be some finessing, but this is more or less what any enhancer will look like:

```js
function withAsyncDataStatus(config) {
  const configNormalized = normalizeConfig(config);

  return function enhanceWithAsyncDataStatus(Wrapped) {
    class WithAsyncDataStatus extends React.PureComponent {
      static displayName = `WithAsyncDataStatus(${getDisplayName(Wrapped)})`;
      static WrappedComponent = Wrapped;

      // NOTE: Pretty sure this is an antipattern,
      // but I can't think of another way off hand to solve it.
      isMounted = true;

      state = {
        propValues: this.createInitialPropValues(),
      };

      // These are defined once.
      requestors = this.createRequestors();

      componentWillUnmount() {
        this.isMounted = false;
      }

      createInitialPropValues() {
        // NOTE: May have to refactor to just operate on an object
        // rather than use map/reduce, because typescript.
        return Object.entries(configNormalized)
        .map(([propName, propConfig]) => [
          propName,
          propConfig.initialValue(),
        ])
        .reduce(
          (propValues, [propName, singlePropValue]) => {
            propValues[propName] = singlePropValue;
            return propValues;
          },
          {}
        )
      }

      createRequestors() {
        // NOTE: May have to refactor to just operate on an object
        // rather than use map/reduce, because typescript.
        return Object.entries(configNormalized)
        .map(([propName, propConfig]) => [
          propName,
          (...args) => {
            this.updatePropValue(propName, AsyncData.Waiting());
            return propConfig.request(this.props)(...args)
            .then(res => {
              return this.updatePropValue(propName, AsyncData.Result(res));
            })
            .catch(error => {
              return this.updatePropValue(propName, AsyncData.Error(error));
            })
          }
        ])
        .reduce(
          (requestorProps, [propName, propRequestor]) => {
            requestorProps[propName] = propRequestor;
            return requestorProps;
          },
          {}
        )
      }

      updatePropValue(propName, nextPropValue) {
        const propConfig = configNormalized[propName];

        const calculatedNextPropValue = propConfig.reduce(
          this.state.propValues[propName],
          nextPropValue,
          this.props
        );

        // We want to avoid calling setState when unmounted, but cannot preclude
        // the possibility of a request being made just before a component is unmounted.
        // Simply skipping the setState call should be all that is sufficient to avoid issues.
        // NOTE: Pretty sure it's an antipattern to track the mounted status like this.
        if (this.isMounted) {
          this.setState({
            propValues: Object.assign({}, this.state.propValues, {
              [propName]: calculatedNextPropValue,
            }),
          });
        }

        return calculatedNextPropValue;
      }

      render() {
        return (
          <Wrapped
            {...this.props}
            {...this.requestors}
            {...this.state.propValues}
          />
        );
      }
    }

    return WithAsyncDataStatus;
  }
}
```

This is more or less a straight port of what I've written (about 4 times already) for Vue.

I think that's about it, really.  The Vue implementation was fewer lines, but that's because Vue uses a MobX style interface, while React uses a state-update-enqueing interface.  It would also be shorter due to all the Typescript definitions that it does not have.

It's not nearly as complicated as React-Redux Connect, mostly because it's interfacing between very complex things.  It does one thing and one thing only: Maintain a bit of state per requestor.


### Type Spec

Now the fun part.

To reiterate,

```js
interface WithAsyncDataStatus {
  <Config>(config: UnnormalizedConfig<Config>): ComponentEnhancer<Config>;
}

interface ComponentEnhancer<Config> {
  <OwnProps extends ExtendedProps<OwnProps, Config>>(ComponentType<OwnProps>):
    ComponentClass<Omit<OwnProps, ExtendedProps<OwnProps, Config>>> & {WrappedComponent: ComponentType<OwnProps>}
}
```

That's not too bad, it's just a bunch of reboxing and intersection.

Things to define:
- `Omit<{}, Ks>` (just copy from Redux, they copied it from elsewhere too.)
- `ExtendedProps<OwnProps, Config>`
- `Config`
- `UnnormalizedConfig<Config>`

```js
interface Config<OwnProps> {
  <R. E, P = AsyncData<R, E>>[propName: string]:
    FullPropConfig<OwnProps, R, E, P>;
}

interface UnnormalizedConfig<C extends Config<{}>> {
  [K in keyof C]: AnyPropConfig<C[K]>;
}

interface FullPropConfig<OwnProps, TResult, TError, TPropValue> {
  request: Requestor<OwnProps, TResult, TError>,
  reduce: PropReducer<OwnProps, TResult, TError, TPropValue>,
  initialValue: (ownProps: OwnProps) => TPropValue,
}

type RequestorOnlyPropConfig<PC extends FullPropConfig<{}, any, any, any>> =
  Requestor<
    PropConfigOwnProps<PC>,
    PropConfigResult<PC>,
    PropConfigError<PC>
  >;

type AnyPropConfig<PC extends FullPropConfig<{}, any, any, any>> =
  | PC
  | RequestorOnlyPropConfig<PC>
;
```

Okay, that changes what we need above a bit.

```js
interface WithAsyncDataStatus {
  <C extends Config<{}>>(config: UnnormalizedConfig<C>): ComponentEnhancer<C>;
}

interface ComponentEnhancer<C extends Config<{}>> {
  <OwnProps extends ExtendedProps<OwnProps, C>>(ComponentType<OwnProps>):
    ComponentClass<Omit<OwnProps, ExtendedProps<OwnProps, C>>> & {WrappedComponent: ComponentType<OwnProps>}
}
```

It also gives us a few more things to define:
- `Requestor<OwnProps, R, E>`
- `PropReducer<OwnProps, R, E, P>`



### Fresh Look

I stepped away from work for a week or so and, coming back, I think that basically copy-pasting [what Redux did for their enhancer types](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/react-redux/index.d.ts#L75) will work for this.  I then just need to define how the config results in the new props to inject, and their `InferableComponentEnhancerWithProps` will take care of the rest.  I don't even need the `InferableComponentEnhancer` case because I don't have a no-config case to handle.

Since I still need to define the mapping between config and injected props, this doesn't obviate the majority of the work above, just removes the need to do my own `ComponentEnhancer` thingy.  Given they export the `InferableComponentEnhancerWithProps` interface, I could probably just use that directly, no need to even copy-paste.

Additionally, things can be simplified type wise if I do another thing:
- Don't transform the functions' outputs to be our new values, rather just leave them as is and only "tap" the inputs and outputs of the functions.
  - This prevents needing to fudge around the function types.
  - This has the maybe-nice property of not changing what the function returns.

#### Using InferableComponentEnhancerWithProps

So, `InferableComponentEnhancerWithProps`:

```js
// Injects props and removes them from the prop requirements.
// Will not pass through the injected props if they are passed in during
// render. Also adds new prop requirements from TNeedsProps.
export interface InferableComponentEnhancerWithProps<TInjectedProps, TNeedsProps> {
  (
    component: StatelessComponent<TInjectedProps>
  ): ComponentClass<TNeedsProps> & {WrappedComponent: StatelessComponent<TInjectedProps>}
  <P extends Shared<TInjectedProps, P>>(
    component: ComponentType<P>
  ): ComponentClass<Omit<P, keyof Shared<TInjectedProps, P>> & TNeedsProps> & {WrappedComponent: ComponentType<P>}
}
```

First, we see the comment explaining what happens.  Next, by checking out the actual interfaces defined, we see that we can either
- accept a component of only injected props and return a component of only needed props (with `WrappedComponent`)
- accept a component of props that includes both its own props and the injected props, and returns a component of the own props and needed props, but without the injected props.
  - And as noted in the comments, those injected props will be overwritten anyway, so we're free to ignore them.

In both cases, we can see that a `ComponentClass` is always returned by the enhancer, which makes sense.

If we then look at `Connect`, we see this for the most relevant interface:

```js
export interface Connect {
  // ...

  <TStateProps = {}, no_dispatch = {}, TOwnProps = {}, State = {}>(
      mapStateToProps: MapStateToPropsParam<TStateProps, TOwnProps, State>
  ): InferableComponentEnhancerWithProps<TStateProps & DispatchProp, TOwnProps>;

  // ...
}
```

#### Interfacing with React-Redux

Our project uses React-Redux's `connect` to interface with Redux, using Redux Thunk to deal with executing fetches.  This means we need to interface with functions that are already being passed down through props.  This doesn't mean much for types, but it does affect the interface.

In the base conception, it means we'll have a lot of repetition:

```js
export default compose(
  connect(
    mapStateToProps,
    function mapDispatchToProps(dispatch, ownProps) {
      return {
        getFoo: () => fetch(metadataAPI().getFoo(ownProps.fooId)),
      };
    }
  ),
  asyncData({
    getFoo: (props) => props.getFoo,
  })
)(FooPanel);
```

That's quite a bit of repetition.

I don't want to tie asyncData tightly to connect, I'm still recovering from another project.

The least repetitive way to do this would be to allow an array of prop names:

```js
export default compose(
  connect(
    mapStateToProps,
    function mapDispatchToProps(dispatch, ownProps) {
      return {
        getFoo: () => fetch(metadataAPI().getFoo(ownProps.fooId)),
      };
    }
  ),
  asyncData(['getFoo'])
  // FooPanel now has props = { getFoo, asyncData: { getFoo } }
)(FooPanel);
```

That only repeats the same `getFoo` twice.

#### More HOFs

One way to eliminate this nicely would be to create another HOF that uses both React-Redux's Connect and this AsyncData HOF and wraps them up nice and neat in another one, thus making a combo rather like `mapDispatchToProps` but simultaneously adding a new `asyncData` props for each one.

```js
const connectedAsyncData = asyncDataConfig => compose(
  connect(null, mapDispatchToPropsFromAsyncDataConfig(asyncDataConfig)),
  asyncData(normalConfigFromConnectedConfig(asyncDataConfig))
)

// ...

compose(
  connectedAsyncData({
    getFoo: (dispatch, props) => () => dispatch(metadataAPI().getFoo(props.fooId)),
  })
  // Now has { getFoo: () => Promise<Foo>, asyncData: { getFoo: AsyncData<Foo, Error> } }
)(FooPanel)
```

#### On mapStateToProps vs asyncData

While these are kind of related, they're only related in that the resolution of the fetch, the underlying fetch that is, affects the data in Redux via side effects.  This usually results in some data being discarded, especially when dealing with failures in bulk APIs.

It cannot be assumed, then, that the fetch's own resolution directly affects the data coming from Redux, so asyncData cannot really care about that.

I suppose if I wanted to go that far, I could do something like rather than having `(prevPropValue, nextResValue, ownProps) => nextPropValue`, instead having `(prevPropValue, nextResValue, ownProps, state) => nextPropValue`, at least for `connectedAsyncData`.

Then again, it might be arguable that if an inner component is dependent on fetches, it should be the one selecting the data, but I think the UI cases are too complex to just stipulate that.

I think what I'll go with is: `connectedAsyncData` is only concerned with fetches and dispatching, it doesn't care about actually getting things back out of redux.  That's for other things to do, like `connect(mapStateToProps)`.  On top of that, it should be more or less a boilerplate reduction of composing `connect` and `asyncData`.

#### Composition of Connect and AsyncData

So, we should be able to do something like this:

```js
connectedAsyncData({
  getFoo: (dispatch, props) => () => dispatch(someAsyncThunkCreator(props.fooId)),
})
```

and effectively get:

```js
compose(
  connect(null, function mapDispatchToProps(dispatch, ownProps) {
    return {
      getFoo: config.getFoo(dispatch, ownProps),
    };
  }),
  asyncData({
    getFoo: (props) => props.getFoo,
  })
)
```

Any other options should be passed on to `asyncData`:

```js
connectedAsyncData({
  getFoo: {
    request: (dispatch, props) => () => dispatch(someAsyncThunkCreator(props.fooId)),
    reduce: (prevPropValue, nextResValue, ownProps) => nextResValue,
    initialValue: () => (ownProps) => AsyncData.NotAsked(),
  },
})
```

giving us...

```js
compose(
  connect(null, function mapDispatchToProps(dispatch, ownProps) {
    return {
      getFoo: config.getFoo(dispatch, ownProps),
    };
  }),
  asyncData({
    getFoo: {
      request: (props) => props.getFoo,
      reduce: (prevPropValue, nextResValue, ownProps) => nextResValue,
      initialValue: () => (ownProps) => AsyncData.NotAsked(),
    },
  })
)
```

I could certainly come up with a clever way to integrate `mapStateToProps`, but I'm not really sure I want to.

So, that seems like a good way to do it.  I think.  I'll review it tomorrow.

> Aside: In Elm, these are stored in the state, because Elm has no notion of components or props!


### Trying Types Again

So, I've got those interfaces, just need to actually specify types.

On our inputs, we've got a bunch of prop definitions that eventually each boil down to:
- `(ownProps: OwnProps) => (...args) => R`

On our outputs, we need to add an additional prop:
- `asyncData: { [K in keyof C]: AsyncData<Res<C[K]>, Error> }` where `C` is the config of the props.

Incidentally, we then need to be able to actually specify the `asyncData` prop for the wrapped component.  Something like...
- `AsyncDataProps<Pick<DispatchProps, 'getFoo' | 'updateFoo'>>` assuming that each prop picked off of `DispatchProps` is in the form of `(...anyArgs: A) => Promise<R>`.  This is fine since that's what they ought to be.
  - NOTE: `DispatchProps` is illustrative, there's no requirement this be used with React-Redux.
  - Or, actually, now that I think about it... If `getFoo` doesn't already exist, `asyncData` adds it, and if it does exist, it replaces it.  Hmmm.

#### How to Specify Required Props

I think the only way to do that is to pass that in as externally facing props, because otherwise it doesn't know what all is available to it.  Just like when React Redux's Connect has to take into account OwnProps, we'll have to just explicitly include an `OwnProps` type in the type parameters of our interface.

```js
interface Connect {
  // ... others.

  <no_state = {}, TDispatchProps = {}, TOwnProps = {}>(
    mapStateToProps: null | undefined,
    mapDispatchToProps: MapDispatchToPropsParam<TDispatchProps, TOwnProps>
  ): InferableComponentEnhancerWithProps<TDispatchProps, TOwnProps>;

  // ... others.
}
```

For the most part, things get inferred just by specifying `mapDispatchToProps`, which itself has to specify a type for `TOwnProps`.  In our case, we'll just have to specify the `TOwnProps` type parameter at call time to avoid referencing it every time we specify `(props) => props.getFoo`.

```js
asyncData<OwnProps>({
  //       type now known as OwnProps.
  getFoo: (ownProps) => ownProps.getFoo,
})
```

Thus, we have an enhancer that can accept a `Component<OwnProps & AsyncDataProps<OwnProps, Config>>` and return a `Component<OwnProps>`.  In the case of integrating with Connect, we have something like `type ConnectedOwnProps = OwnProps & StateProps & DispatchProps`, then just use `ConnectedOwnProps` above instead of `OwnProps`.  Verbose, but oh well.

Fortunately, `Config` is already just an object-map type, so I don't need to worry too much about special types there, but I will want to make that `AsyncDataProps<OwnProps, Config>` type, otherwise things will be far too annoying even for me.

There is a special case, though, if all of the functions used are also functions passed in... Then, all that happens is we get `OwnProps & { asyncData: { [K in keyof OwnProps]: AsyncData<ReturnType<OwnProps[K]>, Error> } }`, nothing else added!  Hm!  Not sure if that's actually something we can use, though.  (Also have to remember to omit from `OwnProps` anything replaced by the props created from `Config`.)

Looking back at `InferableComponentEnhancerWithProps<TInjectedProps, TNeedsProps>`, we have...
- `TInjectedProps = AsyncDataProps<TOwnProps, Config>`
- `TNeedsProps = TOwnProps`, this second one being the same as the use by `Connect`.

#### AsyncDataProps

Now that we know what we need from a Props stand point, we can work from there to figure everything else out.

```js
type AsyncDataProps<TOwnProps, TConfig extends AsyncDataConfig<TOwnProps>> =
  AsyncDataRequestorsProps<TConfig>
  & { asyncData: AsyncDataPropsValues<TOwnProps, TConfig> }
  ;
```

That's pretty simple.  Probably.

```js
type AsyncDataRequestorsProps<TConfig> = {
  [K in keyof TConfig]: SingleRequestorProp<TConfig[K]>;
}

type SingleRequestorProp<SinglePropConfig> = ReturnType<RequestorGetter<SinglePropConfig>>;
```

Since nothing in any of the props depends on any of the other props having the same `TOwnProps`, `AsyncDataRequestorsProps` doesn't need to parametrize on that.

We may want to normalize `SinglePropConfig` before getting to SingleRequestorProp, though.  Maybe something like this:

```js
type AsyncDataProps<
  TOwnProps,
  TConfigRaw extends AsyncDataConfig<TOwnProps>,
  TConfig = NormalizedAsyncDataConfig<TConfigRaw>
> =
  AsyncDataRequestorsProps<TConfig>
  & { asyncData: AsyncDataPropsValues<TOwnProps, TConfig> }
  ;
```

That makes the other two types easier, but may be too hairy itself.  A better option may be to just have `RequestorGetter<SinglePropConfig>` itself do the normalization.

In the React-Redux use-case, though, I think we'll only need to deal with the `asyncData` prop, as noted in the previous section, giving us basically `OwnProps & { asyncData: ... }`, due to just reusing the Dispatch props.  This in mind, might want to create a separate type for that special case where the requestors are just being reused straight from props (and use the same names.)

```js
export type AsyncDataProps<TOwnProps, TConfig extends AsyncDataConfig<TOwnProps>> =
  AsyncDataRequestorsProps<TConfig>
  & AsyncDataValuesOnlyProps<TConfig>
  ;

// exported separately because sometimes it's all you need.
export type AsyncDataValuesOnlyProps<TConfig> = {
  asyncData: AsyncDataPropsValues<TConfig>,
};

type AsyncDataPropsValues<TConfig> = {
  [K in keyof TConfig]: PropValueType<TConfig[K]>;
};
```

I might want to rename `RequestorGetter<SinglePropConfig>` and `PropValueType<SinglePropConfig>`, but I think that's about right.



## Type Cleanup

While the implementation isn't that difficult, expressing the proper types for static typing goodness is a bit more of a challenge.  Even with all the planning, there are things which didn't work quite as I'd hoped, or which need more constraining.


### Type of Config: Props

I wanted to have the Config type guarantee the same props everywhere, but it looks like we can't do that if we want to defer the props until later.  I guess that's why React-Redux's connect had to specify `TOwnProps` at the connect-interface level rather than inside.  Bah, okay, whatever.

Need to move the prop types up top.  I think it should just be `TOwnProps` and `TConfig`.  After that, we can base the exposed props on the accepted props.
