Journal 2019-12-02 - Subclasses And Getters And Setters
=======

How do getters/setters work with respect to overriding in classes?  I'm not actually sure!  I've never done it before, and honestly most cases where it would be useful could be handled by patterns other than extension, for instance via a middleware-style pattern where an instance is either passed the next-in-line via function parameter or prebound to a next-in-line instance via instance property.  Same thing, different binding style.

So, what happens?

```js
class FooBase {
  constructor(initValue) {
    this._value = initValue;
  }

  get value() {
    return this._value;
  }
  set value(next) {
    // Example side effect: console logging.
    console.log('FooBase.set value: next =', next);
    this._value = next;
  }
}

class FooExt extends FooBase {
  set value(next) {
    console.log('FooExt.set value (before): next =', next);
    super.value = next;
    console.log('FooExt.set value (after): next =', next);
  }
}
```

And, it works almost exactly as expected.  Huh.

```js
var foo = new FooExt('foo');
foo.value = 'bar';
// =>
//   FooExt.set value (before): next = bar
//   FooBase.set value: next = bar
//   FooExt.set value (after): next = bar
```

Just one slight detail missing:

```js
var foo = new FooExt('foo');
console.log(foo.value);
// => undefined
```

Right, since a property using `Object.defineProperty()` has you specify the getter and/or setter, defining one without the other leaves the other as undefined, which the runtime treats as an empty function.  Thus for an undefined getter, you always get back the value `undefined`.

The fix of course is to define the getter:

```js
class FooExt extends FooBase {
  get value() {
    return super.value;
  }
  set value(next) {
    console.log('FooExt.set value (before): next =', next);
    super.value = next;
    console.log('FooExt.set value (after): next =', next);
  }
}
```

It's better that way, honestly.  More explicit, or rather less implicit.
