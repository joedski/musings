type AnyStoreDefinition = {
  state: object;
  modules: { [key: string]: AnyStoreDefinition };
  getters: { [key: string]: AnyGetter };
  mutations: { [key: string]: AnyMutation };
  actions: { [key: string]: AnyAction };
}

type AnyGetter = (
  state: object,
  getters: { [key: string]: AnyGetter },
  rootState: object,
  rootGetters: { [key: string]: AnyGetter }
) => any;

type AnyGetterOf<
  TStoreDefinition extends AnyStoreDefinition,
  TRootStoreDefinition extends AnyStoreDefinition = AnyStoreDefinition
> = (
  state: StoreState<TStoreDefinition>,
  getters: StoreGetters<TStoreDefinition>,
  rootState: StoreState<TRootStoreDefinition>,
  rootGetters: StoreGetters<TRootStoreDefinition>,
) => any;

type AnyMutation = (state: object, payload: any) => void;
type AnyMutationOf<TStoreDefinition extends AnyStoreDefinition> = (state: StoreState<TStoreDefinition>, payload: any) => void;

type AnyAction = (context: {
  dispatch: AnyDispatch,
  commit: AnyCommit,
  getters: { [key: string]: AnyGetter },
  rootGetters: { [key: string]: AnyGetter }
}) => any;

type AnyActionOf<
  TStoreDefinition extends AnyStoreDefinition,
  TRootStoreDefinition extends AnyStoreDefinition = AnyStoreDefinition
> = (context: {
  dispatch: AnyDispatchOf<TStoreDefinition>,
  commit: AnyCommitOf<TStoreDefinition>,
  getters: StoreGetters<TStoreDefinition>,
  rootGetters: StoreGetters<TRootStoreDefinition>
}) => any;

type AnyDispatch = (actionName: string, payload: any) => any;
// type AnyDispatchOf<TStoreDefinition extends AnyStoreDefinition> =
//   TStoreDefinition extends { actions: infer TActions }
//   ? TActions extends { [key: infer TKeys]: AnyAction }
//   // TODO: ... how?
//   ?
//   : never;

type AnyCommit = (mutationName: string, payload: any) => void;






//////// Extractors

type StoreState<TStoreDefinition> = TStoreDefinition extends { state: infer TState } ? TState : never;

type StoreGetters<TStoreDefinition> = TStoreDefinition extends { getters: infer TGetters } ? TGetters : never;



//////// Builders

interface BuildableStoreDefinition<
  TState extends object,
  TModules extends { [key: string]: AnyStoreDefinition },
  TGetters extends { [key: string]: AnyGetter },
  TMutations extends { [key: string]: AnyMutation },
  TActions extends { [key: string]: AnyAction },
  TRootStoreDefinition extends AnyStoreDefinition
> {
  state: TState;
  modules: TModules;
  getters: TGetters;
  mutations: TMutations;
  actions: TActions;

  $mutation<
    TKey extends string,
    TMutation extends AnyMutationOf<BuildableStoreDefinition<TState, TModules, TGetters, TMutations, TActions, TRootStoreDefinition>>
  >(
    key: TKey,
    mutation: TMutation
  ): WithMutation<BuildableStoreDefinition<TState, TModules, TGetters, TMutations, TActions, TRootStoreDefinition>, TKey, TMutation>;

  $getter<
    TKey extends string,
    TGetter extends AnyGetterOf<BuildableStoreDefinition<TState, TModules, TGetters, TMutations, TActions, TRootStoreDefinition>>
  >(
    key: TKey,
    getter: TGetter
  ): WithGetter<BuildableStoreDefinition<TState, TModules, TGetters, TMutations, TActions, TRootStoreDefinition>, TKey, TGetter>

  $action<
    TKey extends string,
    TAction extends AnyActionOf<BuildableStoreDefinition<TState, TModules, TGetters, TMutations, TActions, TRootStoreDefinition>>
  >(
    key: TKey,
    action: TAction
  ): WithAction<BuildableStoreDefinition<TState, TModules, TGetters, TMutations, TActions, TRootStoreDefinition>, TKey, TAction>

  // $getter<
  //   TThis
  // >(this: TThis)
}

type WithMutation<
  TStoreDefinition,
  TKey extends string,
  TMutation,
> = TStoreDefinition & {
  mutations: {
    [K in TKey]: TMutation;
  }
}

type WithGetter<
  TStoreDefinition,
  TKey extends string,
  TGetter,
> = TStoreDefinition & {
  getters: {
    [K in TKey]: TGetter;
  }
}

// const store$0 = {
//   state: { foo: '' },
//   modules: {},
//   getters: {},
//   mutations: {},
//   actions: {},
//   $mutation()
// }

// const store$1 =

// function $mutation<
//   TStoreDefinition extends AnyStoreDefinition,
//   TMutationKey extends string,
//   TMutation extends AnyMutationOf<TStoreDefinition>
// >(this: TStoreDefinition, key: TMutationKey, mutation: TMutation): WithMutation<TStoreDefinition, TMutationKey, TMutation> {
//   // Should we use mutation or not...?
//   this.mutations[key] = mutation;
//   return this as WithMutation<TStoreDefinition, TMutationKey, TMutation>;
// }

// function $getter<
//   TStoreDefinition extends AnyStoreDefinition,
//   TRootStoreDefinition extends AnyStoreDefinition,
//   TMutationKey
// > {}

// function $action<
//   TStoreDefinition extends AnyStoreDefinition,
//   TActionKey extends string,

// >
