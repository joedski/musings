RAF-Throttled Function
======================

I wanted a function that:
- I could call as a function, not as an object with a method
- It would schedule the underlying function with `requestAnimationFrame()`
- It would only call the underlying function once on each animation frame regardless of how many times it was called
- It could be canceled

Something like this seems to fit the bill:

```js
function throttledRAFCallback(fn) {
  let schedulingId = null
  let nextCallback = null

  function cancel() {
    if (schedulingId != null) {
      cancelAnimationFrame(schedulingId)
      schedulingId = null
      nextCallback = null
    }
  }

  function execute() {
    nextCallback()
    schedulingId = null
    nextCallback = null
  }

  function $throttledRAFCallback(...args) {
    nextCallback = () => fn(...args)
    if (schedulingId == null) {
      schedulingId = requestAnimationFrame(execute)
    }
  }

  return Object.assign($throttledRAFCallback, {
    cancel,
  })
}
```
