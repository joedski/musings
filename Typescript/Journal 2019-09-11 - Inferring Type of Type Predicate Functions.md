Journal 2019-09-11 - Inferring Type of Type Predicate Functions
=========

Awhile back I tried to infer the type used in `(v: unknown) => v is T`, to no real success.  I don't know if it's that I just didn't do it right the first time (and since I didn't write it down, I honestly don't know) or if it's that TS is now just that much better, or both... but this is doable now:

```typescript
interface IValidator<T> {
  (value: unknown): value is T;
}

type TValidator<T> = (value: unknown) => value is T;

interface Foo {
  name: 'string';
}

function validateFoo(value: unknown): value is Foo {
  if (typeof value === 'object' && value != null) {
    if ('name' in value && typeof (value as { name?: string })['name'] !== 'string') return false;
    return true;
  }

  return false;
}

type TValidateFoo = typeof validateFoo;
// Correctly infers 'Foo'
type TFoo = TValidateFoo extends IValidator<infer T> ? T : never;
// Correctly infers 'Foo'
type TFoo2 = TValidateFoo extends TValidator<infer T> ? T : never;
// Correctly infers 'Foo'
type TFoo3 = TValidateFoo extends (v: any) => v is infer T ? T : never;
```

Which means I can just use the style of validator AJV puts out: it returns `v is T` style validators rather than ones which throw, which is how I implemented validation in another TS project I was working on.
