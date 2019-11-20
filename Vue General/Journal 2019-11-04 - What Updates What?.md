Journal 2019-11-04 - What Updates What?
========

I seem to be getting more reactivity updates than I expect, even of values that are primitive such as numbers or null.

At least with regards to Computed Properties, I'm guessing then that no actual checking is done to see if the previous value is the same as the next, on the basis that that could swallow deep-object updates.  Dunno.  I could understand that, though.  What I don't understand is a primitive value causing a recomputation of subsequent computed props.

Hm.  I think I need to poke things a bit more, if for no other reason than to correct misconceptualizations.

Some things I am dealing with, places to start:

- State that has objects-as-key-value-maps, whose values are themselves objects of various sorts.
- Computed Properties that access a value in one of those keyed-values.

Sequence of events that seems to be inducing unexpected behavior:

1. ... TK!

So.

State:

```typescript
interface ExampleState {
    object: {
        nullableValue: string | null;
    },
    map: Record<string, ExampleItem>;
}

interface ExampleItem {
    value: string;
}

const initialState: ExampleState = {
    object: {
        nullableValue: null;
    },
    map: {},
};
```

Read scenarios:

- Direct State reads:
    - `state.object`
    - `state.object.nullableValue`
    - `state.map`
    - `state.map[KEY_A]`
    - `state.map[KEY_A] ? state.map[KEY_A].value : null`
    - `state.map[KEY_B]`
    - `state.map[KEY_B] ? state.map[KEY_B].value : null`
- Getters Returning Functions:
    - Function-Getter that touches state directly: `(key, elseValue) => (state.map[key] ? state.map[key].value : elseValue)`
    - Function-Getter that uses `getters` or `rootGetters` argument: `...`
- Getter/Computed that uses a Function-Getter:
    - This tests the supposition that any access to underlying observables should still register subscriptions in a context that causes such registrations.

To test reading subscriptions, I'll be defining computed props for each of the above scenarios, and then watching each one.

Then, I'll see what has updates triggered under the following scenarios:

1. `state.object.nullableValue = 'a string'`
2. `Vue.set(state.map, KEY_A, { value: 'a' })`
3. #2, then `state.map[KEY_A].value = 'b'`
4. #2-#3, then `Vue.set(state.map, KEY_B, { value: 'a' })`
5. #2-#4, then `state.map[KEY_B].value = 'b'`
