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
