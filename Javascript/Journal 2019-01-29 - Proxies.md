Proxies!
========

Time to learn about Proxies!  IE11 need not apply!

Basic signature:

```js
const proxy = new Proxy(target, handler)
```

The `target` is the underlying object, the one that's being proxified, while the `handler` defines all the actual proxification behavior.  There's all manner of fun things, including the `handler.constructor` trap!  Good times, good times.

First though, I'm mostly concerned with `get`.

```js
// example from MDN:
handler.get = function get(target, propKey, receiver) {
    // Only return part of the secret!
    if (propKey === 'secret') {
        return `${target.secret.substr(0, 4)}...`
    }

    return Reflect.get(target, propKey, receiver)
}
```

> NOTE: They call it `receiver`, it's just the `this` context argument in `Function.prototype.call(context, ...args)`, or `.apply`, `Array.prototype.map(fn, context)`, etc.

> NOTE: `Reflect.get` is another thing to look into... But notice that it has the same signature as `handler.get`.  Hmm hmm hmm!

We could do something like this:

```js
var handler = {
    get(target, propKey, receiver) {
        switch (propKey) {
            case 'log':
            case 'warn':
            case 'error':
                return function $log(...args) {
                    return target[propKey]('Intercepted:', ...args)
                }

            default:
                return Reflect.get(target, propKey, receiver)
        }
    },
}

var interceptedConsole = new Proxy(console, handler)
```

I mean, technically, we don't need Proxy to do that, but that's a simple example to serve as a base.  It's also kinda inefficient since we create a new wrapper function every access, but eh.

The more interesting things involve trapping usage of `delete`, `Object.keys()`, the above mentioned `constructor` bit, and other such fun things.
