HyperHTML with Flyd
===================

Stepping aside from more componenty things for a moment, can we do stuff with just HyperHTML and Flyde?

Right off, I imagine some of this will follow a similar trajectory to HyperHTML itself: Utility methods that use WeakMap to to cache instances by parent.  It then becomes about using those to map Flyde streams into our VM, effectively.

What might that look like?

To use Streams as the binding points between VM and HyperHTML, we need to be able to cache actual streams as noted above.  This means using either Map or WeakMap as necessary and, in many cases, being able to call `Stream#stop(true)`.

Now, for single components, that's not to hard.  `flyd.map()` will do fine to transform things, then the renderer gets the actual values from the stream and flushes to the DOM.  The only proviso is that for each `wire`, you need to give a separate stream, so even if they're pulling from the same state, you still need to do at minimum `flyd.map()`, or else you'll need to provide a globally unique id for `wire` to secondarily use.

For Collections, that's a different matter: We now need to be able to go `Stream<a> => Stream<Collection<Stream<mixed>>>`.

> Aside: This reminds me of another minimal stream-based view library.  It wasn't Svelt, that's the disappearing one.  What was it...



## Working Out In Slightly More Detail

The basis for operation is this: Given a Component Type and Stream, create a Render Function.

For collections, though, that's a bit more complicated.  I think we can get around potential issues by stipulating the necessity of a Key.  Other places you have to do that in the Template, here you'd do it at the mapping function.  A bit more direct, but otherwise the same thing.

The fun part of course is this: a Component is a function that's called once on creation.  It returns a Renderer that gets called multiple times.  A Renderer might be called no times, but that's naughty and potentially memory leaky, so don't do that.


### Key Mapper

I think this would do something like: `KeyedMapper :: Stream<T> -> Stream<OrderedCollection<Key, Stream<U>>`

Probably a common use of this is `Stream<OrderedCollection<Key, Stream<U>> -> Stream<OrderedCollection<Key, Renderer>>`

We could then just combine them...

Anyway, given that order is important, it'd probably just return an array of specially shaped items.

Hm.  Okay, so more concretely, I'm going to use Arrays, and return an Array of Streams.  So our type will be `Stream<Array<T>> -> Stream<Array<Stream<U>>>`.  We then need to retain those `Stream<U>`s in memory, memoize them so we can use them as instance handles.  Since we don't want to limit ourselves to map operations, we'll want to allow a general Stream Transform.  So our whole interface becomes `(T -> K, Stream<T> -> Stream<U>) -> Stream<Array<T>> -> Stream<Array<Stream<U>>>`.  Not the friendliest thing, but it does what we want.

```js
const keyedMap = (() => {
    const globalStore = new WeakMap()

    return function keyedMap(keyFn, streamFn) {
        return function $keyedMap(stream$) {
            // ensure a per-stream store.
            if (! globalStore.has(stream$)) globalStore.set(stream$, new Map())
            const streamStore = globalStore.get(stream$)
            const updates = new Map()

            // If we get stopped, eagerly stop any still exsting substreams.
            stream$.end.pipe(flyd.on(() => {
                streamStore.forEach((valueStream$ => (
                    valueStream$.end() === true
                        ? null
                        : valueStream$.end(true)
                )))
            }))

            return stream$.pipe(flyd.map(values => {
                for (let k of streamStore.keys()) updates.set(k, false)
                for (let [i, k] of values.map((elem, i) => [i, keyFn(elem, i)])) updates.set(k, i)

                const result = []

                updates.forEach((index, key) => {
                    if (index === false) {
                        streamStore.get(key).push.end()
                        streamStore.delete(key)
                    }
                    else {
                        if (! streamStore.has(key)) {
                            // values go into here
                            const valueStreamSource$ = flyd.stream()
                            // and get transformed here
                            const valueStream$ = valueStreamSource$.pipe(streamFn)
                            // but we need to make sure to stop both (I think, anyway)
                            // also to push values in.  That's important too.
                            valueStream$.push = valueStreamSource$
                            streamStore.set(key, valueStream$)
                        }
                        result[index] = streamStore.get(key)
                        result[index].push(values[index])
                    }
                })

                return result

                updates.clear()
            }))
        }
    }
})()
```

Hm.  That's pretty complicated, and we ended up creating two streams anyway.  May as well just split it into two separate operations, and deal only with the memoization of the base streams bit.

```js
// :: (T -> K) Stream<Array<T>> -> Stream<Array<Stream<T>>
const memoizedSpread = (() => {
    const globalStore = new WeakMap()

    return function memoizedSpread(keyFn) {
        return function $memoizedSpread(stream$) {
            // ensure a per-stream store.
            if (! globalStore.has(stream$)) globalStore.set(stream$, new Map())
            const streamStore = globalStore.get(stream$)
            const updates = new Map()

            // If we get stopped, eagerly stop any still exsting substreams.
            stream$.end.pipe(flyd.on(() => {
                streamStore.forEach((valueStream$ => (
                    valueStream$.end() === true
                        ? null
                        : valueStream$.end(true)
                )))
            }))

            return stream$.pipe(flyd.map(values => {
                for (let k of streamStore.keys()) updates.set(k, false)
                for (let [i, k] of values.map((elem, i) => [i, keyFn(elem, i)])) updates.set(k, i)

                const result = []

                updates.forEach((index, key) => {
                    if (index === false) {
                        streamStore.get(key).end(true)
                        streamStore.delete(key)
                    }
                    else {
                        if (! streamStore.has(key)) {
                            streamStore.set(key, flyd.stream())
                        }
                        result[index] = streamStore.get(key)
                        result[index](values[index])
                    }
                })

                updates.clear()

                return result
            }))
        }
    }
})()
```

We can then create a thing which memoizes pipe operations on such arrays of streams:

```js
// :: (Stream<T> -> Stream<U>) -> Stream<Array<Stream<T>>> -> Stream<Array<Stream<U>>>
const memoizedSpreadPipe = (() => {
    const globalStore = new WeakMap()

    return function memoizedSpreadPipe(streamFn) {
        return function $memoizedSpreadPipe(stream$) {
            // ensure a per-stream store.
            if (! globalStore.has(stream$)) globalStore.set(stream$, new Map())
            const streamStore = globalStore.get(stream$)
            const updates = new Map()

            // If we get stopped, eagerly stop any still exsting substreams.
            stream$.end.pipe(flyd.on(() => {
                streamStore.forEach((valueStream$ => (
                    valueStream$.end() === true
                        ? null
                        : valueStream$.end(true)
                )))
            }))

            return stream$.pipe(flyd.map(values => {
                for (let k of streamStore.keys()) updates.set(k, false)
                for (let [i, k] of values.map((elem, i) => [i, elem])) updates.set(k, i)

                const result = []

                updates.forEach((index, key) => {
                    if (index === false) {
                        // TODO: Do we need to stop() this here?
                        // Or do we assume a prior stage will do that?
                        // UPDATE: After reading on `stream.stop`, I think the answer is
                        // that we don't need to stop this stream here because
                        // it's derived from a parent stream.
                        // streamStore.get(key).end(true)
                        streamStore.delete(key)
                    }
                    else {
                        if (!streamStore.has(key)) {
                            streamStore.set(key, values[index].pipe(streamFn))
                        }
                        result[index] = streamStore.get(key)
                    }
                })

                updates.clear()

                return result
            }))
        }
    }
})()
```

Huh.  That's ... almost the exact same thing.  Well, I can work it out when I'm not tired and sick.  I should also test it...

Hm.  Given it's a WeakMap, and I'm depending on other things to hold references to the streams anyway, I wonder if I really need use that WeakMap at all.  Since the way I'm setting this up, streams are basically replacing the component tree of other VNode systems, they're created as necessary and then dropped as necessary... And just like other Component based systems, you have to do all the key jiggery pokery here.

> Aside: Given the comparison to components, I have to wonder if there's a way to listen for when a stream is stopped?  [Yes, there is](https://github.com/paldepind/flyd#streamend): `stream$.end.pipe(flyd.on(() => {...}))`.  While I knew you could do `stream$.end(true)` to stop a stream, I didn't know you could also listen for it.  Makes sense, though, if you push a `true` to stop it.  So, that's the component removal hook equivalent.

Now, obviously, dropping the global WeakMap means that actually calling the function twice produces two different stores for each call.  But it does simplify the code a bit, and makes things a bit easier to understand, maybe.  Does it make things drastically simpler?  Actual run wise, probably, but code wise, not that much... I think, anyway.  Let's see.

Also, I think I could simplify things a bit more, too.  Since we're wrapping a call to `stream.pipe`, and we have to call `pipe` to use it... why not just return the function returned by `flyd.map`?  Well, actually, that would change things, operationally.  It would only create one store per call to `memoizedSpread(keyFn)` rather than one store per call to `stream.pipe(memoizedSpread(keyFn))`.  Not what we want.

```js
function memoizedSpread(keyFn = (elem, index) => index) {
    return function $memoizedSpread(stream$) {
        const streamStore = new Map()
        const updates = new Map()

        // If we get stopped, eagerly stop any still exsting substreams.
        stream$.end.pipe(flyd.on(() => {
            streamStore.forEach((valueStream$ => (
                valueStream$.end() === true
                    ? null
                    : valueStream$.end(true)
            )))
        }))

        return stream$.pipe(flyd.map(values => {
            for (let k of streamStore.keys()) updates.set(k, false)
            for (let [i, k] of values.map((elem, i) => [i, keyFn(elem, i)])) updates.set(k, i)

            const result = []

            updates.forEach((index, key) => {
                if (index === false) {
                    streamStore.get(key).end(true)
                    streamStore.delete(key)
                }
                else {
                    if (! streamStore.has(key)) {
                        streamStore.set(key, flyd.stream())
                    }
                    result[index] = streamStore.get(key)
                    result[index](values[index])
                }
            })

            updates.clear()

            return result
        }))
    }
}
```

This does appear to be working under casual testing:

```js
var src = flyd.stream([])
var strms = src.pipe(memoizedSpread(elem => elem.id))
var shoutyIndex = 0
var shouty = strms.pipe(flyd.on(substreams => {
    console.log(`push ${shoutyIndex}: ${substreams.map(elem => elem().value).join(',')}`)
    shoutyIndex += 1
}))

src([{ id: 'a', value: 3 }, { id: 'b', value: 42 }])
var shouldBeSubStreamA1 = strms()[0]

src([{ id: 'b', value: 42 }, { id: 'a', value: 3 }])
var shouldBeSubStreamA2 = strms()[1]

// Should be true
console.log(`did substream "a" match? ${shouldBeSubStreamA1 === shouldBeSubStreamA2}`)

var shouldBeSubStreamB1 = strms()[0]

src([{ id: 'a', value: 4000 }, { id: 'c', value: 200 }])

src([{ id: 'b', value: 42 }, { id: 'a', value: 3 }, { id: 'c', value: 1000 }])
var shouldBeSubStreamB2 = strms()[0]

// Should be false
console.log(`did substream "b" match? ${shouldBeSubStreamB1 === shouldBeSubStreamB2}`)
// Should be true
console.log(`is the first substream "b" ended? ${shouldBeSubStreamB1.end() === true}`)
```

Cool!

So, naming wise, `memoizedSpreadOf` might be better.  There's also that slight concession to possible performance by reusing the `updates` Map.

So that takes care of instances on the VM side.  This thus allows us to keep HyperHTML efficient by not tossing out `wire`s all the time.  That means we can do what we strive to do with streams: statically define the data transformations!



## Using the Memoized Thingies

So, with `memoizedSpreadOf` and `memoizedSpreadPipe`, we can do things like this...

> TK!



## Old Stuff?

```js
// Some old code.  Probably obsolete once I return to it.
const actions$ = flyd.stream()
const state$ = actions$.pipe(flyd.scan(
    (acc, action) => {
        switch (action[0]) {
            case 'incr':
                if (action[1][0] >= acc.length) return acc
                return acc.map((c, i) => {
                    if (i === action[1][0]) return c + action[1][1]
                    return c
                })

            default: return acc
        }
    },
    [2, 5, 1]
))
// An opinionated function that memoizes stream creation.
// :: (T -> K, T -> U) -> Stream<Array<T>> -> Stream<Array<Stream<U>>>
const keyedMap = (() => {
    const keyedMapGlobalStore = new WeakMap()
    return function keyedMap(keyFn, valueFn) {
        return function $keyedMap(stream$) {
            if (!keyedMapGlobalStore.has(stream$)) keyedMapGlobalStore.set(stream$, new Map())
            const streamStore = keyedMapGlobalStore.get(stream$)
            return stream$.pipe(flyd.map(arr => {
                const updates = new Map()
                for (let k of streamStore.keys()) updates.set(k, false)
                for (let [i, k] of arr.map((e, i) => [i, keyFn(e, i)]))) updates.set(k, i)
                const result = []
                updates.forEach((elem, key) => {
                    // Here's what does the actual instance management.
                    if (elem === false) {
                        const resultStream = streamStore.get(key)
                        streamStore.delete(key)
                        resultStream.end()
                    }
                    else {
                        if (!streamStore.get(key)) {
                            streamStore.set(key, stream$.pipe(flyd.map(valueFn)))
                        }
                        result[elem] = streamStore.get(key)
                    }
                })
                return result
            }))
        }
    }
})()

function App(actions$, state$) {
    const html = hyperHTML.wire(state$)
    const counterStates$ = state$.pipe(keyedMap((e, i) => i, e => e))
    // optionally can accept "props".
    const render = () => {
        return html`
        <h1>Counters!</h1>
        ${/* we have to call the resultant render function to render DOM nodes. */
            counterStates$().map($ => Counter(actions$, $)())}
        `
    }
}
```



## Actual Rendering

There's a few steps we have to do:
- `(Sources, Sinks) => RenderFn`
