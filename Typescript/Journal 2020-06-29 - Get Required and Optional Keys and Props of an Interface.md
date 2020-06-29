Journal 2020-06-29 - Get Required and Optional Keys and Props of an Interface
========

Suppose for whatever reason, we have an interface `Foo` which has some props that are required and some props that are optional, and we'd like to get a set of keys of either one or the other, since if we had one we could easily get the other.

```typescript
interface Foo {
  foo: string;
  bar: number;
  baz?: string;
  sub?: number;
}

// should be: 'foo' | 'bar'
type RequiredKeysFoo = RequiredKeys<Foo>;

// should be: 'baz' | 'sub'
type OptionalKeysFoo = OptionalKeys<Foo>;
```

How might we go about doing that?

First thing is, we at least have these utility types here in the TS Standard Library:

```typescript
// Derived interface where all props are non-optional.
type Required<T> = { [K in keyof T]-?: T[K] };

// Derived interface where all props are optional.
type Partial<T> = { [K in keyof T]?: T[K] };
```

Second thing is, we know that `Required<T> extends Partial<T>`, but not vice versa.  That is, values of type `Required<T>` are assignable to slots of type `Partial<T>`, but not the other way around since `Required<T>` is more strict, more tightly constrained, more narrowly defined, than `Partial<T>`.



## How To Use Those Things Together?

The basic idea is this: We want to check each key itself, but we have to check it in terms of each property on the given interface (`Foo` in our examples), not just the keys themselves.  So, what we want to do then is basically break it down into a set of `{ foo: string } extends Required<{ foo: string }>` or `{ baz?: string } extends Required<{ baz?: string }>` style conditional types, where of course required props will pass it and optional props will fail it.

Put a bit more specifically:

- Given T:
    - For K in keyof T:
        - If Pick<T, K> extends Required<Pick<T, K>>:
            - Then K is required
            - Else K is optional

Since we only want to bother with one side of the branch, we'll just go with the required side, which makes our conditional type look like this:

```typescript
type KeyIfRequired<T, K extends keyof T> =
    Pick<T, K> extends Required<Pick<T, K>> ? K : never;
```

Remember that `keyof T` is a union of keys, and that [we can distribute across a union if that union is represented as a bare Type Parameter in a conditional type](https://www.typescriptlang.org/docs/handbook/advanced-types.html#distributive-conditional-types).  So, we already know we need `keyof T` to be passed as a parameter to some other type alias.  That can't be just the alias we defined above though, because `K` in there is not a bare type parameter in a condition, but rather it appears somewhere down inside the condition.

That is, while `K extends ...` appears in there, it's as a _type contraint_ rather than a _type condition_.  So, instead of `KeyIfRequired<T, K extends keyof T> = ...` we would want `KeyIfRequired<T, K> = K extends keyof T ? ... : ...`.  Let's do just that, then:

```typescript
type KeyIfRequired<T, K> =
    K extends keyof T
        ? Pick<T, K> extends Required<Pick<T, K>> ? K : never
        : never;
```

Okay, does that work?

```typescript
// = 'foo' | 'bar'; and, it does!
type RequiredKeysFoo = KeyIfRequired<Foo, keyof Foo>;
```

Huzzah!  That's actually the only hard part, here.  The rest is just wrapping it up pretty with a bow.

```typescript
type RequiredKeys<T> = KeyIfRequired<T, keyof T>;

type KeyIfRequired<T, K> =
    K extends keyof T
        ? Pick<T, K> extends Required<Pick<T, K>> ? K : never
    : never;

// = 'foo' | 'bar'
type RequiredKeysFoo1 = RequiredKeys<Foo>;
```

That seems a bit obnoxious to create a type solely for the purpose of distributing across a union.  Can we just infer a new type parameter?

As it happens, at least by TS 3.9 (and maybe earlier), yes we can:

```typescript
type RequiredKeys2<T> =
    keyof T extends infer K
    ? K extends keyof T
    ? Pick<T, K> extends Required<Pick<T, K>> ? K : never
    : never
    : never;

// = 'foo' | 'bar'
type RequiredKeysFoo2 = RequiredKeys2<Foo>;
```

Nice.



## Optional Keys!

Now that we can get only the Required Keys, getting Optional Keys is as simple as just excluding the Required Keys from All Keys:

```typescript
type OptionalKeys<T> = Exclude<keyof T, RequiredKeys<T>>;

// = 'baz' | 'sub'
type OptionalKeysFoo = OptionalKeys<Foo>;
```



## Aside: Pick

A small quirk in TS's type system I ran into while messing around with types for this thing:

```typescript
// Utility type in standard lib:
type Pick<T, K extends keyof T> = { [P in K]: T[P] };

// Variation that you might expect to act the same:
type PickCond<T, K> = K extends keyof T ? { [P in K]: T[P] } : never;
```

Seems like a reasonable expectation, doesn't it?  Surprisingly, that doesn't work:

```typescript
type SomeKeys = 'bar' | 'baz';

// = { bar: number; baz?: string; }
type SomeOfFoo1 = Pick<Foo, SomeKeys>;

//                    vvv Not optional!
// = { bar: number; baz: string; }
type SomeOfFoo2 = PickCond<Foo, SomeKeys>;
```

Very strange!
