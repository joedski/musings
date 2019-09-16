Journal 2019-09-12 - Working With Abstract Classes As Values
========

Typescript has support for Abstract Classes, which is nice in that you can specify a contract and some functionality while still requiring the extension to actually specify functionality for the unimplemented parts.  Naturally, Abstract Classes cannot be instantiated.

This can be a bit of a problem when dealing with those Abstract Classes as values, though, especially where you want to create an Abstract Class that extends some other Base Class.



## The Concrete Use Case

The exact case I'm dealing with here is writing Mixins with Vue Class Component type stuff.  Currently these have to be implemented using concrete Classes, as Abstract Classes run a problem:

- Abstract Classes are not constructable, and so cannot be decorated with the `@Component` decorator.
- I still want `@Component` stuff happening... (the creation of the `$options` object, that is.)



## Initial Experimentation


### Accepting Abstract Classes That Extend Some Base As Arguments

```typescript
class Base {
  constructor(
    public b: string
  ) {}
}

abstract class Mixin extends Base {
  abstract m: string;
}

function acceptsExtendsBase<T extends typeof Base>(k: T): T {
  return k;
}

// Error: Cannot assign an abstract constructor type to a non-abstract constructor type.
acceptsExtendsBase(Mixin);

function acceptsExtendsBase2<T extends { prototype: Base }>(k: T): T {
  return k;
}

// Works fine.
acceptsExtendsBase2(Mixin);

abstract class NotExtendedFromBase {
  abstract m: string;
}

// Error: Types of property 'prototype' are incompatible.
acceptsExtendsBase2(NotExtendedFromBase);

// There's also the case of accepting things which extend from an abstract base class,
// but that's not quite what I was looking for.
// https://github.com/DefinitelyTyped/DefinitelyTyped/issues/11541#issuecomment-249993744
```

We can also intersect with `Function` for good measure, as in [this answer](https://stackoverflow.com/a/38642922):

```
type AutoConstructor<T> = Function & { prototype: T };
```


### Decorators On Abstract Members

What happens if I apply a decorator to an abstract member?

```typescript
function Prop<T, K extends keyof T>(target: T, key: K) {
    console.log('Abstract Prop:', target, key);
}

abstract class Foo {
    @Prop
    abstract m: string;
}
```

Results in the following output (in TS v3.5.1):

```js
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    // utility code here...
};
function Prop(target, key) {
    console.log('Abstract Prop:', target, key);
}
class Foo {
}
__decorate([
    Prop
], Foo.prototype, "m", void 0);
```

The upshot then is that we don't actually need the member to exist, which is fine since member properties don't really exist regardless until the constructor is executed.
