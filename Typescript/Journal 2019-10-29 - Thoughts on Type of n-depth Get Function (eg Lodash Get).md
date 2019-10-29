Journal 2019-10-29 - Thoughts on Type of n-depth Get Function (eg Lodash Get)
======

Not sure if it's possible to do in Typescript, but I haven't given it much thought yet.

This is basically the function equivalent of the new conditional `?.` and `?[]` accessors in TS 3.7.  Not including `??`/else-value support because, eh.  Conditional access is hard enough.

Thing is, I imagine that, if it were possible, then someone would've already done it for `Lodash.get`, but no one has yet.

```typescript
function get<T extends object, Ks extends (string | symbol)[]>(target: T, ...keys: Ks) {
    // ????????
}

function get1<T extends object, K extends keyof T>(target: T, key: K): T[K] | void {
    return target[key];
}

// equiv to get1(get1(t, k1), k2)
function get2<
    T extends object,
    K1 extends keyof T,
    K2 extends keyof T[K1]
>(target: T, key1: K1, key2: K2): T[K1][K2] | void {
    if (target[key1] == null) return undefined;
    return target[key1][key2];
}

// equiv to get1(get1(get1(t, k1), k2), k3)
function get3<
    T extends object,
    K1 extends keyof T,
    K2 extends keyof T[K1],
    K3 extends keyof T[K1][K2]
>(target: T, key1: K1, key2: K2, key3: K3): T[K1][K2][K3] | void {
    if (target[key1] == null) return undefined;
    if (target[key1][key2] == null) return undefined;
    return target[key1][key2][key3];
}
```
