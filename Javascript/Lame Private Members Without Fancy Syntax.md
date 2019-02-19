Lame Private Members Without Fancy Syntax
=========================================

Closure with a `WeakMap`:

```js
const Foo = (() => {
    const $private = new WeakMap()

    return class Foo {
        constructor() {
            super()

            // other constructor stuff...

            $private.set(this, {})
        }

        get somePrivateProp() {
            return $private.get(this).somePrivateProp
        }

        set somePrivateProp(next) {
            $private.get(this).somePrivateProp = next
        }
    }
})
```

Of course, you might want private methods, too:

```js
const Foo = (() => {
    const $private = new WeakMap()

    class Foo$Private {
        constructor($) {
            super()
            this.$ = $
            this.privateMember = ''
        }

        privateMethod(foo) {
            return foo + this.$.publicMember + this.privateMember
        }
    }

    return class Foo {
        constructor() {
            super()
            this.publicMember = ''
            $private.set(this, new Foo$Private(this))
        }

        publicMethod(foo) {
            return $private.get(this).privateMethod(foo)
        }
    }
})
```
