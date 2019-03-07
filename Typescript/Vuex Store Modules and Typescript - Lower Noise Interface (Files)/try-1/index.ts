interface IFoo {
  id: string;
  bars: Array<IBar>;
}

interface IBar {
  id: string;
  description: string;
}

interface IRootState {
  foo: IFoo;
  selectedBarId: string | null;
}

const root = storeModule({
  namespaced: false,
  state: ({
    foo: {
      id: 'a',
      bars: [],
    },
    selectedBarId: null,
  } as IRootState),
  getters: {
    selectedBar(state, getters): IBar | void {
      const selectedBarId = state.selectedBarId;
      return state.foo.bars.find(bar => bar.id === selectedBarId);
    },
  },
  mutations: {
    SET_SELECTED_BAR_ID(state, { id }: { id: string }) {
      state.selectedBarId = id;
    },
  },
  actions: {
    async selectBar({ commit }, { id }: { id: string }) {
      commit('SET_SELECTED_BAR_ID', { id });
    },
  },
});

// Nope, not working either.
// ////////
// // Okay, new strategy... decompose it with utility functions and put it back together.

// function storeModule<TStoreModule extends AnyStoreModule>(m: TStoreModule) {
//   const state = storeModuleState(m.state);
//   const mutations = storeModuleMutations<typeof state, typeof m.mutations>(m.mutations);
  
//   return {
//     state,
//     mutations,
//   }
// }

// function storeModuleState<TState extends {}>(state: TState) {
//   return state;
// }

// function storeModuleMutations<
//   TState extends {},
//   TMutations extends AnyStoreMutation<TState>,
// >(m: TMutations) {
//   return m;
// }

// interface AnyStoreModule {
//   state: {};
//   mutations: {
//     [key: string]: (state: any, payload: any) => void;
//   };
// }

// interface AnyStoreMutation<TState> {
//   [key: string]: (state: TState, payload: any) => void;
// }

// Doesn't work because it says they don't overlay sufficiently.
// function storeModule<
//   TStoreModule extends AnyStoreModule
// >(m: TStoreModule) {
//   return (m as StoreModule<
//     StoreStateOf<typeof m>,
//     StoreMutationsOf<typeof m>
//   >);
// }

// interface StoreModule<
//   TState,
//   TMutations,
//   > {
//   namespaced?: boolean;
//   state: TState;
//   modules?: {};
//   getters: {};
//   mutations: TMutations;
//   actions: {};
// }

////////
// // Circular constraint again.  Bah.
// function storeModule<TStoreModule extends AnyStoreModule<TStoreModule>>(
//   m: TStoreModule
// ): TStoreModule {
//   return m
// }

// type AnyStoreModule<TStoreModule> =
//   TStoreModule extends {
//     // TODO: namespaced, modules
//     state: infer TState,
//     mutations: infer TMutations,
//   }
//   ? TMutations extends AnyStoreMutations<TState>
//   ? {
//     state: TState,
//     mutations: TMutations,
//   }
//   : never
//   : never
//   ;

// interface AnyStoreMutations<TState> {
//   [key: string]: (state: TState, payload: any) => any;
// }


////////
// function storeModule<
//   TState extends {},
//   // TODO: Modules support
//   TGetters extends AnyStoreGetters<TState>,
//   TMutations extends AnyStoreMutations<TState>,
//   // TODO: Modules support
//   TActions extends AnyStoreActions<TState, TGetters, TMutations>,
//   // TAnyActions extends AnyStoreActions<TState, TGetters, TMutations>,
//   // TDispatch extends AnyStoreDispatch<TAnyActions> = AnyStoreDispatch<TAnyActions>,
//   // TActions extends StoreActions<TState, TGetters, TMutations, TDispatch
// >(
//   m: StoreModule<TState, TGetters, TMutations, TActions>
// ): StoreModule<TState, TGetters, TMutations, TActions> {
//   return m;
// }

// interface StoreModule<
//   TState,
//   TGetters,
//   TMutations,
//   TActions,
// > {
//   namespaced?: boolean;
//   state: TState;
//   modules?: {};
//   getters: TGetters;
//   mutations: TMutations;
//   actions: TActions;
// }

// interface AnyStoreModule {
//   namespaced?: boolean;
//   modules?: {};
//   state: {};
//   getters?: {};
//   mutations?: {};
//   actions?: {};
// }

// type StoreMutationsOf<TStoreModule> =
//   TStoreModule extends { mutations: infer TStoreMutations }
//   ? TStoreMutations extends AnyStoreMutations<StoreStateOf<TStoreModule>>
//   ? TStoreMutations
//   : never
//   : never
//   ;

// interface AnyStoreGetters<TState> {
//   [key: string]: (state: TState, getters: AnyStoreGetters<TState>) => any;
// }

// interface AnyStoreMutations<TState> {
//   [key: string]: (state: TState, payload: any) => any;
// }


// // Trial 1
// interface AnyStoreActions<TState, TGetters, TMutations> {
//   [key: string]: (
//     context: StoreActionContext<TState, TGetters, TMutations, AnyStoreActions<TState, TGetters, TMutations>>,
//     payload: any
//   ) => any;
// }

// // TODO: modules support
// interface StoreActionContext<
//   TState,
//   TGetters,
//   TMutations,
//   TActions,
// > {
//   dispatch: AnyStoreDispatch<TActions>;
//   commit: AnyStoreCommit<TMutations>;
//   getters: TGetters;
//   state: TState;
// }


// // Trial 2: No improvement:
// // interface AnyStoreActions<TState, TGetters, TMutations, TActions> {
// //   [key: string]: (
// //     context: StoreActionContext<TState, TGetters, TMutations, TActions>,
// //     payload: any
// //   ) => any;
// // }

// // // TODO: modules support
// // interface StoreActionContext<
// //   TState,
// //   TGetters,
// //   TMutations,
// //   TActions,
// //   > {
// //   dispatch: AnyStoreDispatch<TActions>;
// //   commit: AnyStoreCommit<TMutations>;
// //   getters: TGetters;
// //   state: TState;
// // }


// // Trial 3 No improvement: Still not getting a good type for commit().
// // interface AnyStoreActions<TState, TGetters, TMutations, TActions> {
// //   [key: string]: (
// //     context: StoreActionContext<TState, TGetters, TMutations, TActions>,
// //     payload: any
// //   ) => any;
// // }

// // // TODO: modules support
// // interface StoreActionContext<
// //   TState,
// //   TGetters,
// //   TMutations,
// //   TActions,
// //   TDispatch extends AnyStoreDispatch<TActions> = AnyStoreDispatch<TActions>,
// //   TCommit extends AnyStoreCommit<TMutations> = AnyStoreCommit<TMutations>,
// // > {
// //   // dispatch: AnyStoreDispatch<TActions>;
// //   // commit: AnyStoreCommit<TMutations>;
// //   dispatch: TDispatch;
// //   commit: TCommit;
// //   getters: TGetters;
// //   state: TState;
// // }


// // // Trial 4: Mapped type?  I think I'm trying too hard...
// // // Result: It just made things worse!
// // type AnyStoreActions<TActions, TState, TGetters, TMutations> = {
// //   [K in keyof TActions]: TActions[K] extends (
// //     context: StoreActionContext<TState, TGetters, TMutations, AnyAnyStoreActions<TState, TGetters, TMutations>>,
// //     payload: any
// //   ) => any ? Arg0<TActions[K]> extends StoreActionContext<TState, TGetters, TMutations, AnyAnyStoreActions<TState, TGetters, TMutations>> ? TActions[K] : never : never;
// // }
// //   ;

// // interface AnyAnyStoreActions<TState, TGetters, TMutations> {
// //   [key: string]: (
// //     context: StoreActionContext<TState, TGetters, TMutations, AnyAnyStoreActions<TState, TGetters, TMutations>>,
// //     payload: any
// //   ) => any;
// // }

// // // TODO: modules support
// // interface StoreActionContext<
// //   TState,
// //   TGetters,
// //   TMutations,
// //   TActions,
// // > {
// //   dispatch: AnyStoreDispatch<TActions>;
// //   commit: AnyStoreCommit<TMutations>;
// //   getters: TGetters;
// //   state: TState;
// // }


// type AnyStoreDispatch<TActions, TKey extends keyof TActions = keyof TActions> =
//   TActions extends { [key: string]: (state: any, payload: any) => any }
//   ? TKey extends string
//   ? (key: TKey, payload: Arg1<TActions[TKey]>) => ReturnType<TActions[TKey]>
//   : never
//   : never
//   ;

// type Arg0<TFn> = TFn extends (arg0: infer TArg0) => any ? TArg0 : never;
// type Arg1<TFn> = TFn extends (arg0: any, arg1: infer TArg1) => any ? TArg1 : never;

// type AnyStoreCommit<TMutations, TKey extends keyof TMutations = keyof TMutations> =
//   TMutations extends { [key: string]: (state: any, payload: any) => any }
//   ? TKey extends string
//   ? (key: TKey, payload: Arg1<TMutations[TKey]>) => ReturnType<TMutations[TKey]>
//   : never
//   : never
//   ;
// // const actions = {
// //   selectBar({ commit }: StoreActionContext<IRootState, typeof root.getters, typeof root.mutations, {}>, { id }) {
// //     commit('SET_SELECTED_BAR_ID', { id });
// //   },
// //   doThing(ctx: StoreActionContext<IRootState, typeof root.getters, typeof root.mutations, {}>, { id }) {
// //     return Promise.resolve(id)
// //   },
// // };
// // type RootDispatch = AnyStoreDispatch<typeof actions>;



// type StoreStateOf<TStoreModule> =
//   TStoreModule extends { state: infer TState } ? TState extends {} ? TState : never : never;

// type RootStoreState = StoreStateOf<typeof root>;
// type RootStoreMutations = StoreMutationsOf<typeof root>;