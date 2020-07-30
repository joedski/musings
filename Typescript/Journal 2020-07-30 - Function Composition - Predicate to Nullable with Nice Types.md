Journal 2020-07-30 - Function Composition - Predicate to Nullable with Nice Types
========

I was recently dealing with a case where I needed to conditionally call a mapping function or just return null, something I'd dealt with before, and wondered what a generalization of that might be?

This particular case was: given a function mapping parameters to requset config, a predicate on required and not-null parameters, and a list of keys that are required and not-null, what is the decomposition of that into reusable base utilities and how do those work back into the full solution?

The initial implementation took the standard "map keys and mapper to composed mapper" approach, just using an in-line for-loop, but I wanted to know if I could get a more compositional solution.



## Attempt 1

Here's the bare inputs:

- List of keys to require presence and non-nullness of.
- Target function mapping parameters to request config.

Here's the usual process:

- Given list of keys, mapping function:
    - Return a new function on a target object:
        - For each key in list of keys:
            - If key is in target object and property at key of target object is not null:
                - Then: go to next loop iteration.
                - Else: return null.
        - Return result of calling mapping function with target object.

This translates pretty literally to code, though there is a type error due to the conditional logic not being implemented in a way TS can understand.

```typescript
type ObjectWithOptionalNullableKeys<T, Ks extends string> =
    Partial<NullableProps<Pick<T, Ks & keyof T>>> &
    Omit<T, Ks>;

type NullableProps<T> = {
    [K in keyof T]: T[K] | null;
}

function keyInObject<T, K extends string>(key: K, target: T): key is (K & keyof T) {
    return key in target;
}

function requireKeys2<Ks extends string, T, R>(
    keys: Ks[],
    fn: (target: T) => R
) {
    return function $requireKeys2(target: ObjectWithOptionalNullableKeys<T, Ks>): R | null {
        for (const k of keys) {
            if (keyInObject(k, target) && target[k] != null) continue;
            return null;
        }

        // Type error...
        return fn(target)
    }
}
```

Let's break that down a bit more, then:

```typescript
function hasRequiredKeysNotNull<Ks extends string, T>(
    keys: Ks[],
    target: ObjectWithOptionalNullableKeys<T, Ks>
): target is T {
    for (const k of keys) {
        if (keyInObject(k, target) && target[k] != null) continue;
        return false;
    }
    return true;
}

// No more type errors!
function requireKeys3<Ks extends string, T, R>(
    keys: Ks[],
    fn: (target: T) => R
) {
    return function $requireKeys3(target: ObjectWithOptionalNullableKeys<T, Ks>): R | null {
        if (hasRequiredKeysNotNull(keys, target)) {
            return fn(target);
        }

        return null;
    }
}
```

So that works.  There's that predicate I was talking about, too.  So it looks like we end up with a few things:

- Predicate: `<Ks, T>(keys: Ks[], target: OptNullable<T>) => target is T`
- Mapper: `<T, R>(params: T) => R`
- Keys: `keys: Ks[]`

Hm.  Perhaps this, then: `nullablizeMapper :: paramPredicate => mapper => nullableMapper`

Or more specifically:

```
nullableMapper<T, OT, R> :: ((param: OT) -> param is T) -> (T -> R) -> (OT -> R)
```

With the last parens provided just to make it clear what's the return value.

```typescript
function nullableLift<OT, T extends OT, R>(
    predicate: (param: OT) => param is T,
    map: (param: T) => R
): ((param: OT) => R | null) {
    return function nullableLiftedMap(param) {
        if (predicate(param)) {
            return map(param);
        }

        return null;
    }
}

function hasRequiredKeysNotNullPredicate<Ks extends string>(keys: Ks[]) {
    return function $hasRequiredKeysNotNull<T>(target: ObjectWithOptionalNullableKeys<T, Ks>): target is T {
        for (const k of keys) {
            if (keyInObject(k, target) && target[k] != null) continue;
            return false;
        }
        return true;
    }
}

// :: <T>(target: ObjectWithOptionalNullableKeys<T, "foo" | "bar">) => target is T
const predicate4 = hasRequiredKeysNotNullPredicate(['foo', 'bar'])

// :: function nullableLift<unknown, Foo, Boxed<Foo>>(predicate: (param: unknown) => param is Foo, map: (param: Foo) => Boxed<Foo>): (param: unknown) => Boxed<Foo> | null
// Error on 'predicate4': Argument of type '<T>(target: ObjectWithOptionalNullableKeys<T, "foo" | "bar">) => target is T' is not assignable to parameter of type '(param: unknown) => param is Foo'.
const requireKeys4 = nullableLift(
    predicate4,
    (foo: Foo) => boxUp(foo)
);
```

Hm.  It seems that TS is not able to infer the type of `OT` in `nullableLift`.  Why not?  It certainly infers `T` and `R` just fine.  Odd.  Breaking it into multiple steps does not help either: it just makes things worse.

```typescript
function nullableLift2<OT, T extends OT>(predicate: (param: OT) => param is T): <R>(map: (param: T) => R) => (param: OT) => R | null {
    return function $nullableLift2(map) {
        return function nullableLiftedMap(param) {
            if (predicate(param)) {
                return map(param);
            }

            return null;
        }
    }
}

// :: function nullableLift2<unknown, unknown>(predicate: (param: unknown) => param is unknown): <R>(map: (param: unknown) => R) => (param: unknown) => R | null
// Error on 'predicate': Argument of type '<T>(target: ObjectWithOptionalNullableKeys<T, "foo" | "bar">) => target is T' is not assignable to parameter of type '(param: unknown) => param is unknown'.
const requireKeys5 = nullableLift2(predicate4);

// This of course works fine, but that's not what we want.
const requireKeys6 = nullableLift2<ObjectWithOptionalNullableKeys<Foo, 'foo' | 'bar'>, Foo>(predicate4);
```

Perhaps if I lead with the mapper, then?

```typescript
function nullableLift3<T, R>(map: (param: T) => R) {
    return function $nullableLift3<OT>(
        predicate: T extends OT ? (param: OT) => param is T : never
    ) {
        return function nullableLiftedMap(param: OT): R | null {
            if (predicate(param)) return map(param);
            return null;
        }
    }
}

const requireKeys7_1 = nullableLift3((foo: Foo) => boxUp(foo));
// Same error for predicate.  `unknown` is inferred for OT.
const requireKeys7_2 = requireKeys7_1(predicate4);
```

Dang.  Given it can infer T and R, I'm still not sure why it can't infer OT, specifically in this case why it can't infer it as `ObjectWithOptionalNullableKeys<T, "foo" | "bar">`.



## Unfilled Type Parameter on Predicate (probably)

Thinking about it, I think it's because the predicate has its own type parameter, that TS isn't sure how to fill in or forward.  This becomes clearer if we change the names a bit:

```typescript
function hasRequiredKeysNotNullPredicate<Ks extends string>(keys: Ks[]) {
    // change <T> to <PT>:
    return function $hasRequiredKeysNotNull<PT>(target: ObjectWithOptionalNullableKeys<PT, Ks>): target is PT {
        for (const k of keys) {
            if (keyInObject(k, target) && target[k] != null) continue;
            return false;
        }
        return true;
    }
}
```

So, the question is, how do we either specify a type for that parameter, or how do we forward it?

Predicates are usually intentionally generic, especially ones like this, but in this case we want to narrow it to being applied to a specific other type, in this case the type that is the input of the map function, but only at the time we specify the map function.

Not sure if it's possible in TS, though.

Unless...



## Reuse the Argument?

There are some cases where TypeScript can [produce generic functions when inferring types](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#higher-order-type-inference-from-generic-functions), but I'm not sure under what circumstances that works exactly.  This will take more study.

```typescript
function nullableLift4<TPredicate extends (arg: any) => arg is any>(predicate: TPredicate) {
    return function $nullableLift4<TArg, TRet>(map: (arg: TArg) => TRet) {
        return function $$nullableLift4(marg: TPredicate extends (marg: infer TPArg) => marg is any ? TPArg : never) {
            if (predicate(marg)) return map(marg);
            return null;
        }
    }
}

// Still got unknown in there: :: <TArg, TRet>(map: (arg: TArg) => TRet) => (marg: ObjectWithOptionalNullableKeys<unknown, "foo" | "bar">) => TRet | null
const nl4_1 = nullableLift4(predicate4);
const nl4_2 = nl4_1((foo: Foo) => boxUp(foo));
```

Hm.  Maybe the issue is that I'm not giving enough shape to the arguments?

The types we're dealing with are:

- `TPrArg`, the type of the predicate input.
- `TArg`, the type of the map input.  This extends `TPrArg`.
- `TRet`, the type of the return value.

Looking at [the lengthier description and attendent discussion](https://github.com/Microsoft/TypeScript/pull/30215), I wonder if it's because of that `TArg extends TPrArg` part that's messing things up?  It says in there that type inferrence goes from left to right, but this kinda requires bouncing around because because, while we know `TRet` and `TArg`, we don't know `TPrArg`, but we need it declared and defined before `TArg` in order to give that `TArg extends TPrArg` stipulation, as otherwise we can't do `(a: TPrArg) => a is TArg`.



## Is There A Better Way To Break It Down?

I'm not sure it's doable given the weird type dependency order I have.  I suppose one question is, is it possible to at least do `(predicate) -> (value) -> Maybe<value>`?  Because if so it should be possible to then do `Maybe<value> -> mappedValue | null` since that's just `map (fn) |> getOr (null)`.
