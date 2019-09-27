---
- tags:
  - vuejs
  - typescript
---
Journal 2019-09-27 - Playing With Typed Decorators
========

> NOTE: This uses Stage 1 Decorator stuff, the deprecated stuff, because that's what tsc allows as of writing.

```typescript
type PropertyType<T, K extends symbol | string> = T extends Record<K, infer V> ? V : unknown;

function TypedWatch<TKey extends string>(key: TKey) {
  return function TypedWatchMemberDecorator<
    TTarget extends Record<TKey, any>,
    TTargetMemberKey extends keyof TTarget,
  >(
    target: TTarget,
    targetKey: TTargetMemberKey,
    descriptor: TypedPropertyDescriptor<TTarget[TTargetMemberKey]>
  ) {
    // Type Error on `targetKey`: Argument of type 'TTargetMemberKey' is not assignable to parameter of type 'string | symbol'.
    //   Type 'keyof TTarget' is not assignable to type 'string | symbol'.
    //     Type 'string | number | symbol' is not assignable to type 'string | symbol'.
    Watch(key)(target, targetKey, descriptor);
  }
}
```

Well, something anyway.
