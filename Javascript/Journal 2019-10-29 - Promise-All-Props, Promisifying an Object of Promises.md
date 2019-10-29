Journal 2019-10-29 - Promise-All-Props, Promisifying an Object of Promises
========

Not much to say here, just wanted to write it down.  Also, VSCode supports full TS typing in the `@type` thingy, which is nice.

Obviously we have to do a bit of conditional typing since JS allows you to `await` on non-promise values (it basically acts like `Promise.resolve()`), but that's about the only complication.

```js
/**
 * Given an object of promises, return a promise on an object of resolutions.
 * @type {<T extends Record<string | symbol, any>>(objOfPromises: T) => Promise<{ [K in keyof T]: T[K] extends Promise<infer R> ? R : T[K] }>}
 * @param objOfPromises An object whose properties' values are promises.
 */
export default async function promiseAllProps(objOfPromises) {
  const entries = await Promise.all(
    // or use Object.entries() if you have that.
    Object.keys(objOfPromises)
      .map(async (key) => [key, await objOfPromises[key]])
  );

  return entries.reduce(
    (acc, [key, resolution]) => {
      acc[key] = resolution;
      return acc;
    },
    {}
  );
}
```
