AsyncData - Vue Interface
=========================

Just some initial sketching.  May replace this with refinements later.

```js
this.foo // -> AsyncData.NotAsked
this.$asyncData.foo()
this.foo // -> AsyncData.Waiting

// manual reset:
this.foo = this.$asyncData.$notAsked()

// manual test:
this.$asyncData.$is(this.foo) // -> true
this.$asyncData.$waiting.$is(this.foo) // -> false
this.$asyncData.$notAsked.$is(this.foo) // -> true
```

Previously, I added extra methods prefixed with `get`, so an async data prop `foo` would create an attendant method `getFoo`, but that's not TypeScript friendly, and doesn't namespace things as much.  Putting the request initiators on `this.$asyncData.propName` seems like a nicer solution.

I'll probably still use Daggy under the hood.

Being lazy, I could just do this:

```js
export default {
  beforeCreate() {
    this.$asyncData = Object.create(AsyncData, {
      ...createAsyncDataGetters(this)
    })
  },
}
```

That gives us an interface like so:

```js
this.foo = this.$asyncData.NotAsked

this.$asyncData.is(this.foo) // -> true
this.$asyncData.NotAsked.is(this.foo) // -> true
this.$asyncData.foo()

this.$asyncData.Waiting.is(this.foo) // -> true
```

I think Daggy's use of non-functions for types of no arguments is annoying, but oh well.  I guess it does not obscure the fact that they're singletons.

Though, I don't like the remote possibilities of name conflicts and like somewhat readable names, so maybe...

```js
export default {
  beforeCreate() {
    this.$asyncData = Object.create(AsyncData, {
      get: createAsyncDataGetters(this),
    })
  }
}
```

Which yields

```js
this.$asyncData.get.foo()
```

Which is perhaps a bit more sensical.
