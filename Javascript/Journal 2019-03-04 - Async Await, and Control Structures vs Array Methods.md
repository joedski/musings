Journal 2019-03-04 - Async Await, and Control Structures vs Array Methods
=========================================================================



## Serial Iteration, Optionally Returning Each Result

Iterating over a collection and serially performing an async task is simple enough:

```js
async function doThingsSerially(things) {
    for (const thing of things) {
        await doThing(thing)
    }
}
```

It's also simple enough to reproduce the same behavior with `Array#reduce`:

```js
function doThingsSerially(things) {
  return things.reduce(
    (acc, thing) => acc.then(
      () => doThing(thing).then(() => {})
    ),
    Promise.resolve()
  )
}
```

The `.then(() => {})` isn't strictly necessary, but it does enforce the return type of `Promise<void>`.

Returning the result of every task is also easy:

```js
async function doThingsSerially(things) {
    const acc = []
    for (const thing of things) {
        acc.push(await doThing(thing))
    }
    return acc
}
```

```js
function doThingsSerially(things) {
  return things.reduce(
    (acc, thing) => acc.then(
      reses => doThing(thing)
        .then(nextRes => {
          reses.push(nextRes)
          return reses
        })
    ),
    Promise.resolve([])
  )
}
```

While one might ordinarily use `reses.concat` in the `reduce` form, I mutated it here just to make it functionally the same.



## Feeding Each Result Forward

This one is also a simple enough variation of the previous item.

```js
async function reduceThings(things, initial) {
    let acc = initial
    for (const thing of things) {
        acc = await doThing(thing, acc)
    }
    return acc
}
```

Simple enough.  This one is even less different looking in the `Array#reduce` case:

```js
function reduceThings(things, initial) {
    return things.reduce(
        (acc, thing) => acc.then(prev => doThing(thing, prev)),
        Promise.resolve(initial)
    )
}
```
