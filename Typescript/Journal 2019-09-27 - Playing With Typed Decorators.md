---
- tags:
  - vuejs
  - typescript
---
Journal 2019-09-27 - Playing With Typed Decorators
========

> NOTE: This uses Stage 1 Decorator stuff, the deprecated stuff, because that's what tsc allows as of writing.  Also, Vue stuff abounds.

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

Let's start by taking a look at some already defined types.

Here's some basic types declared in `lib.es5.d.ts`:

```typescript
declare type PropertyDecorator =
  (target: Object, propertyKey: string | symbol) => void;

declare type MethodDecorator =
  <T>(target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>) =>
    TypedPropertyDescriptor<T> | void;

interface TypedPropertyDescriptor<T> {
    enumerable?: boolean;
    configurable?: boolean;
    writable?: boolean;
    value?: T;
    get?: () => T;
    set?: (value: T) => void;
}
```

And some actual decorators declared in `vue-property-decorator.d.ts`:

```typescript
/**
 * decorator of a prop
 * @param  options the options for the prop
 * @return PropertyDecorator | void
 */
export declare function Prop(options?: (PropOptions | Constructor[] | Constructor)): PropertyDecorator;
/**
 * decorator of a watch function
 * @param  path the path or the expression to observe
 * @param  WatchOption
 * @return MethodDecorator
 */
export declare function Watch(path: string, options?: WatchOptions): MethodDecorator;
```

If we look at the type of `target` in the `MethodDecorator`, we know of course that `target` is the prototype of class.  Given that, we should be able to put other restrictions on it:

```typescript
function RequiresFoo<T, TTarget extends { foo: any }>(
    target: TTarget,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>
): void {
    console.log('RequiresFoo', propertyKey, target, descriptor);
}

class Foo {
    public foo: string = 'foo!';

    // This will be a type error if the property `foo` is not present.
    @RequiresFoo
    public sayFoo() {
        console.log(this.foo);
    }
}
```

Now, putting aside the fact that `path` could be a dot-notation string, which Vue helpfully wraps in safe-access all the way down similar to `lodash.get`, we could do something like this:

```typescript
function TypedWatch<TKey extends string>(key: TKey) {
    return function TypedWatchDecorator<
        TTarget extends Record<TKey, any>
    >(
        target: TTarget,
        propertyKey: string | symbol,
        descriptor: TypedPropertyDescriptor<
            (next: TTarget[TKey]>, prev: TTarget[TKey]>) => void
        >
    ) {
        return Watch(key)(target, propertyKey, descriptor);
    };
}
```

```typescript
class FooWithWatch {
    public foo: string = 'foo';

    @TypedWatch('foo')
    protected handleChangeOfFoo(next: string, prev: string) {
        console.log(next);
    }
}
```

This does produce types and type errors and such, but much like how an object literal gets inferred types, class members also get inferred/declared types, and that inferrence/declaration occurs before the decorator is applied.

So, you can't use a decorator to say "this member will have this type" only "this member should have this type".



## A Practical Case: RefreshableData

As a lead in to perhaps a generalized Scanned Prop sort of decorator, I have one common case of a property watch I'd like to handle: Updating a RefreshableData from an AsyncData source.

As a first measure, of course, one can just do basically what `@Watch` from `vue-property-decorator` does.

```typescript
function RefreshableDataWatchForNext(source: string, options?: WatchOptions) {
    return RefreshableDataWatchDecorator<T>(
        target: Object,
        key: string | symbol,
        descriptor: TypedPropertyDescriptor<T>
    ) {
        const originalHook = target.$options.created;
        target.$options.created = function created() {
            this.$watch(source, this[key], options);
            if (typeof originalHook === 'function') {
                originalHook.call(this);
            }
        };
    }
}

class RefreshableData {
    static WatchForNext = RefreshableDataWatch;

    // ... rest of implementation
}
```

Given the possibility that a `string` source can be a dotted path, I don't want to apply types there.  However, if `source` is a function, we can definitely work that.  So we could do, say, this:

```typescript
@Component
class C extends Vue {
    someData!: AsyncData<Something, Error>;

    @RefreshableData.WatchForNext((vm: C) => vm.someData)
    someRefreshable!: RefreshableData<Something, Error>;
}
```

Hm, not like a normal watch that uses `this`.  Hmmm.
