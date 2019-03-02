Vuex Store Modules and Typescript - Lower Noise
===============================================

Wonder if there's a way to make defining a fully-typed store module less annoying?

Considerations:

1. To fully specify Actions, you need to fully specify `dispatch` and `commit`, which get ... interesting.  I'm not even sure that's possible.
    - Maybe check into that early solution someone posted for typing Daggy?  I think that `&`ed a bunch of "dynamically" determined types together to get a fully specified interface.  I think I'd need to do something like that here, again.
        - Well, actually, no, I'd want a Union, with the first arg being the sentinel value.  For Dispatch, `('foo') => Promise<void>` is a separate type in the union from `('bar', bar: IBar) => Promise<void>`, etc.

Prior Art:

1. https://github.com/istrib/vuex-typescript/
    - Kinda like Redux Getters: Pass the store/state and args, get values back.
    - In this case, pass the store, stuff happens.
2. https://github.com/mrcrowl/vuex-typex
    - Started as Vuex-Typescript but taken farther.
    - Uses namespaces, and state-module-associated factories to create the exposed utility functions.

Hm.  I kinda don't like them.  I'd rather have something closer to how Vuex normally defines things, though if I have to break out things like getters, mutations, and actions, I'm not averse to that.

One thing I can say about them, though: They're not likely to accidentally the whole TS Language Server.  They're also more likely to give you friendly type errors, unlike any "do it all at once" method.

I guess something like:

```typescript
export const someModule = defineStoreModule<ISomeModuleState>({
  // Modules.
  modules: {
    otherModule,
    yetAnotherModule,
  },

  // the property on state must match the TState param
  // of defineStoreModule<TState>().
  state: {
    // ...
  }
})
.getters({
  // state will always be defined to have the type of the
  // TState type param up in defineStoreModule<TState>().
  currentThing(state): IThing | null {
    if (state.currentThingId == null) return null;
    return state.thingsById[state.currentThingId] || null;
  },
})
.mutations({
  // all mutations return void.
  // The payload param should always have a type, though.
  SET_USER(state, user: IUser) {
    state.user = user
  },
})
.actions({
  // the context type is defined, and does not need
  // an explicit annotation.
  // The return type should be annotated, though.
  async fetchUser(context) {}
})
```

Hah hah, no idea if that's possible, but I can dream, right?  Also the interface is kinda wonky and possibly unforgiving.  You have to define each one in turn.  But, otherwise, you'd have to do `const lessIncompleteModule = getters(incompleteModule, {...})` which just feels weird, or `defineStoreModule(withModules({...}), withState<IState>({...}), withGetters...)()` which just feels even more ridiculous to use _and_ type.  Chaining methods, although weird looking, allows better separation of interfaces and types.

Another thing, then, is how to actually enforce that the user calls everything?  Is there a good way to define a Store module that doesn't have one or more parts?  Maybe it's so simple you don't need getters?  Or you just want to skip them for the time being until you find a case where you actually do need getters?

Maybe name them `with*`, so `.withGetters()`, `.withMutations()`, `.withActions()`?  That would deconflict the names.  I guess dollar-signs would work, too.

Lastly, there's the small issue of the `context` arg passed into any Action: the `context` makes available other Actions, including the given Action itself, as well as modules, mutations (through `commit`), etc.  Typing that properly might be funky.

Also, can this reuse anything from those two prior art pieces?  Hm.

Well, they all define Getters, Mutations, Actions, etc, one at a time, which makes the interface much easier to deal with.  They also deal with them apart from the main module definition, which makes the types easier to deal with period.  Obviously, I'm trying to avoid the latter, but the former could work, albeit at the cost of verbosity.

So, something like

```typescript
export default defineStoreModule<IState>({
    // ... must match the parameter ISTate.
})
.$modules({...})
.$getter('foo', (state) => state.foo)
.$mutation('SET_FOO', (state, foo: IFoo): void => {
    state.foo = foo;
})
.$mutation('PUSH_ERROR', (state, error: Error | string): void => {
    state.errors.push(error)
})
.$action('fetchFoo', async (context): Promise<IFoo> => {
    try {
        const foo: IFoo = await axios.get('/api/blah/v1/foo')
        context.commit('SET_FOO', foo)
        return foo
    }
    catch (error) {
        context.commit('PUSH_ERROR', error)
    }
})
```

Each one returns a module with a new type, but they don't have to deal with funky derivation where everyone has to know about everyone.  Self-referencing might still be a problem, though.


### Sub-Module Typing?

So, that'd maybe work.  The main complication, then, is how to handle Actions and Mutations of Submodules?  Those are usually done with `commit('thatModule/SET_THING', thing)`, but we can't dynamically build names with the type system.  The best we could do is `commit(['thatModule', 'SET_THING'], thing)` but that means writing context wrapper to handle that.  Bluh.  I mean, granted, it _probably_ wouldn't conflict with normal calls.


### Review of Actual Interfaces

The State itself is pretty obvious.  The User specifies that entirely.

The Getters are where complication starts: The full interface of a Getter is this:

- `type Getter<TState, TGetters, TRootState, TRootGetters, TValue> = (state: TState, getters: TGetters, rootState: TRootState, getters: TRootGetters) => TValue`
    - `TGetters` must extend `{ [name: string]: Getter<any, any, any, any, any> }`

Fortunately, Getters don't call themselves.  Unfortunately, we end up with a circular dependency: Getters on the Root State can refer to Getters on Sub Modules, and Getters on Sub Modules can refer to Getters on the Root State...

Mutations are actually the simplest part, since they are only concerned with their own slice.

- `type Mutation<TState, TPayload> = (state: TState, payload: TPayload) => void`
    - As they are wholly side effectual, they don't return anything.

Actions are where things get Hairy again.

- `type Action<TStateDefinition extends AnyStateDefinition, TRootStateDefinition extends AnyStateDefinition> = (context: { dispatch: DefinitionDispatch<TStateDefinition>, commit: DefinitionCommit<TStateDefinition>, getters: DefinitionGetters<TStateDefinition>, rootGetters: DefinitionGetters<TRootStateDefinition> })`

Okay, maybe not too hairy.  They actually aren't bad, maybe?  Just ... verbose.


### Actual Interface Speculation

So, the entire point of using helper methods like `withAction` or `$action` is to do the type construction for us, and more to the point, to be an "operator" so that we don't need a bunch of intermediate values: each one is passed into the "operator" as the `this` value.

That in mind, then, the typing of each one should be exactly the same as the typing of a free function: It takes some input type, some params, and returns a new output based on those.

What are each of these things?  Or at least, what are the input and output?  The Input and Output are Store Definitions, so I'll probably just call the type that.

```typescript
interface StoreDefinition<
    TState,
    TModules extends { [moduleKey: string]: StoreDefinition<any> },
    TGetters extends AnyStoreGetters<TState>,
    TMutations extends AnyStoreMutations<TState>,
    TActions extends AnyStoreActions<TState, TGetters, TMutations>,
> {
    state: TState,
    modules: TModules,
    getters: TGetters,
    mutations: TMutations,
    actions: TActions,
}
```

That's everything that's necessary, I think.

Each helper then is basically this over and over again: `<TPrevStateDef, TThing>(this: TPrevStateDef, thing: TThing) => StateDefWithNewThing<TPrevStateDef, TThing>`.

I could even build it as `<TThing>(thing: TThing) => <TPrevStateDef extends AnyStateDefinition>(prev: TPrevStateDef) => StateDefWithNewThing<TPrevStateDef, Thing>`, at least for the underlying functions.  The Helpers bit itself needs to use the `this` typing since I'm calling them as methods.

#### Actual Interface Speculation: Mutations

Mutations are the simplest bit, since they deal exclusively with their own state.

We might start with a Store Definition like this:

```
{
    state: ({
        foo: null,
        selectedBarId: null
    } as AppState),
    modules: {},
    getters: {},
    mutations: {},
    actions: {},
}
```

Its type is then this:

```
type $$AppState$0 = {
    state: AppState,
    modules: {},
    getters: {},
    mutations: {},
    actions: {},
}
```

Then we want to add a Mutation that updates `selectedBarId`:

```typescript
storeModuleDef
.$mutation('SET_SELECTED_BAR_ID', (state, barId: number | null) => {
    state.selectedBarId = barId
})
```

This yields a new Store Definition with this type:

```
{
    state: AppState,
    modules: {},
    getters: {},
    mutations: {
        SET_SELECTED_BAR_ID(state: AppState, barId: number | null) => void,
    },
    actions: {},
}
```

So... something like this?

```typescript
type WithMutation<
    TStoreDefinition extends AnyStoreDefinition,
    TMutationKey extends string,
    TMutation extends AnyMutationOf<TStoreDefinition>
> = {
    state: StoreStateType<TStoreDefinition>,
    modules: StoreModulesType<TStoreDefinition>,
    getters: StoreGettersType<TStoreDefinition>,
    mutations: StoreMutationsType<TStoreDefinition> & {
        [TMutationKey]: TMutation;
    },
    actions: StoreActionsType<TStoreDefinition>,
}
```

Or, more concisely...

```typescript
type WithMutation<
    TStoreDefinition extends AnyStoreDefinition,
    TMutationKey extends string,
    TMutation extends AnyMutationOf<TStoreDefinition>
> = TStoreDefinition & {
    mutations: { [TMutationKey]: TMutation }
}
```

... I think.  Playing around in the TS Playground confirms this does happen, even if the unreified type looks terrible.  Which is a bit of a problem.

This means, though, we can theoretically just do `WithWhatever<TStoreDefinition extends {}, blahblahblah> = TStoreDefinition & { whatever: blah }`.  `extends AnyStoreDefinition` might be better, though.

At the very least, I'll need a type for `AnyStoreDefinition`.

```typescript
type AnyStoreDefinition = {
    state: object;
    modules: { [key: string]: AnyStoreDefinition };
    getters: { [key: string]: AnyGetter };
    mutations: { [key: string]: AnyMutation };
    actions: { [key: string]: AnyAction };
}

type AnyGetter = (state: object, getters: { [key: string]: AnyGetter }, rootState: object, rootGetters: { [key: string]: AnyGetter }) => any;

type AnyMutation = (state: object, payload: any) => void;

type AnyAction = (context: { dispatch: AnyDispatch, commit: AnyCommit, getters: { [key: string]: AnyGetter }, rootGetters: { [key: string]: AnyGetter } });

type AnyDispatch = (actionName: string, payload: any) => any;

type AnyCommit = (mutationName: string, payload: any) => void;
```

So now we have basic shapes that we can use as basic-most constraints.  How bout them Mutations?  A slight complication arises: The Mutation should have a constraint that it refers to the State of the Store Definition... So.  New Auxiliary Type.

```typescript
function $withMutation<
    TStoreDefinition extends AnyStoreDefinition,
    TMutationKey extends string,
    TMutation extends AnyMutationOf<TStoreDefinition>
>(this: TStoreDefinition, key: TMutationKey, mutation: TMutation): WithMutation<TStoreDefinition, TMutationKey, TMutation> {
    this.mutations[key] = mutation;
    return this;
}

type AnyMutationOf<TStoreDefinition extends AnyStoreDefinition> = (state: StoreState<TSToreDefinition>, payload: any) => void;

type WithMutation<
  TStoreDefinition extends AnyStoreDefinition,
  TMutationKey extends string,
  TMutation extends AnyMutation
> = TStoreDefinition & {
  mutations: {
    [key: TMutationKey]: TMutation;
  }
}
```

And it doesn't like the `key: TMutationKey` thing.  Bah.  Maybe with `[K in TMutationKey]`?  Well, it's stopped complaining.  Does it work?

I tried this in the Playground and it seemed to work:

```typescript
type WithKey<TObject extends {}, TKey extends string, TProp> = TObject & {
    [K in TKey]: TProp
}

const foo = {
    bar: 'bar',
}

const fooWithBaz: WithKey<typeof foo, 'baz', number> = {
    ...foo,
    baz: 4,
}

// fooWithBaz.bar: string
// fooWithBaz.baz: number
```

So, let's change WithMutation:

```typescript
type WithMutation<
  TStoreDefinition,
  TMutationKey extends string,
  TMutation
> = TStoreDefinition & {
  mutations: {
    [key: TMutationKey]: TMutation;
  }
}
```

Also removed the constraints on `TStoreDefinition` and `TMutation` because they're not really important, and the types are already constrained elsewhere.  More constraints mean more chances to kill the TS language server.

A quick trial seems to prove this works:

```typescript
const before = {
  state: ({ foo: '' } as { foo: string }),
  modules: {},
  getters: {},
  mutations: {},
  actions: {},
  $withMutation
}

const after = before.$withMutation('SET_FOO', (state, foo: string) => {
  state.foo = foo;
})

// after.mutations.SET_FOO :: (state: { foo: string }, foo: string) => void
```
