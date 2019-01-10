Wrapping Integrations that Require External Scripts and Script Tags
===================================================================

A Vue-specific look at this general problem.

Here's the idea:
- A Component requires an External Script.
- That External Script is loaded via a Script Tag.
- We only one one Script Tag so as to avoid accidentally trashing any global state.
- You can't stick Script Tags in Vue Templates because they would result in Side Effects and that's Naughty.
- Thus, on Component Mount, get an existing Script Tag, or create it if it doesn't already exist.

We have some nice things going for us:
- JS is single-threaded.
- The DOM is a globally accessible resource.
- It's trivial to select scripts by their `src` by using Attribute Selectors.



## The Simplest Integration

It's very easy to do:

```js
export default {
    name: 'ThisComponentNeedsThatScript',

    mounted() {
        this.scriptTag = (() => {
            const scriptSrc = 'https://www.example.com/script.js'

            if (document.head.querySelector(`script[src="${scriptSrc}"]`)) {
                return document.head.querySelector(`script[src="${scriptSrc}"]`)
            }
            else {
                const el = document.createElement('script')
                el.src = scriptSrc
                el.$loaded = new Promise((resolve, reject) => {
                    const resolveAndRemove = (event) => {
                        resolve(event)
                        remove()
                    }

                    const rejectAndRemove = (event) => {
                        reject(event)
                        remove()
                    }

                    const remove = () => {
                        el.removeEventListener('load', resolveAndRemove)
                        el.removeEventListener('error', rejectAndRemove)
                    }

                    el.addEventListener('load', resolveAndRemove)
                    el.addEventListener('error', rejectAndRemove)
                })
                document.head.appendChild(el)
                return el
            }
        })()

        this.scriptTag.$loaded.then(() => {
            // Do whatever.
            this.scriptTagLoaded = true
        })
    },
}
```

The promise gives us a consistent interface so we don't have to do a conditionally-add-event-listeners type dealio.  One could faff about with ways of holding the promise other than sticking it directly to the DOM Element Object itself, but it works, and is globally accessible.  It even works outside of Vue!


### Wrapping It Up Pretty

Given that, and that we can't really do much with the Script Tag itself, we may as well just handle only a Promise that either resolves or rejects.

```js
function loadScript(scriptSrc) {
    let scriptTag = document.head.querySelector(`script[src="${scriptSrc}"]`)

    if (! scriptTag) {
        scriptTag = document.createElement('script')
        scriptTag.src = scriptSrc
        scriptTag.$loaded = new Promise((resolve, reject) => {
            const resolveAndRemove = (event) => {
                resolve(event)
                remove()
            }

            const rejectAndRemove = (event) => {
                reject(event)
                remove()
            }

            const remove = () => {
                scriptTag.removeEventListener('load', resolveAndRemove)
                scriptTag.removeEventListener('error', rejectAndRemove)
            }

            scriptTag.addEventListener('load', resolveAndRemove)
            scriptTag.addEventListener('error', rejectAndRemove)
        })
        document.head.appendChild(scriptTag)
    }

    return scriptTag.$loaded
}
```

Nice.

From there, you can do all manner of things like adding a mixin that automatically sets data props and whatnot, but this is simple enough.

You could even avoid attaching novel properties to objects you shouldn't do that to with WeakMap:

```js
const loadScript = (() => {
    const loadedPromises = new WeakMap()

    return function loadScript(scriptSrc) {
        let scriptTag = document.head.querySelector(`script[src="${scriptSrc}"]`)

        if (! scriptTag) {
            scriptTag = document.createElement('script')
            scriptTag.src = scriptSrc
            const scriptTagLoadedPromise = new Promise((resolve, reject) => {
                const resolveAndRemove = (event) => {
                    resolve(event)
                    remove()
                }

                const rejectAndRemove = (event) => {
                    reject(event)
                    remove()
                }

                const remove = () => {
                    scriptTag.removeEventListener('load', resolveAndRemove)
                    scriptTag.removeEventListener('error', rejectAndRemove)
                }

                scriptTag.addEventListener('load', resolveAndRemove)
                scriptTag.addEventListener('error', rejectAndRemove)
            })
            loadedPromises.set(scriptTag, scriptTagLoadedPromise)
            document.head.appendChild(scriptTag)
        }

        return loadedPromises.get(scriptTag)
    }
})()
```

Easy peasy.
