Journal 2020-02-03 - Post-Data Errors - mapDataToMaybeError
========

> Not quite sure yet if this is what I want to do, but it is something that seems useful in enough cases to formalize.

Sometimes, even after you load all your data, there are cases where you may need to block things with an error.  This could include cases such as permissions or empty results.

To be clear, using an Error case is not always the right thing to do, especially with empty collection cases, but sometimes that is all you want to do.

Shown here in JS because that's currently what I'm using.

```js
/**
 * Maps a data case to maybe an error case.
 *
 * The map function should return either an error reason
 * (using `new Error()` is recommended, but not required)
 * or return nothing at all (explicitly returning `undefined`
 * is fine too).
 * @param  {(data: TData) => (TMappedError | void)} mapFn Function
 *         mapping data to maybe an error.
 * @return {AsyncData<TData, TMappedError>} AsyncData with mapped
 *         error type.
 */
AsyncData.prototype.mapDataToMaybeError = function AsyncData$mapDataToMaybeError(mapFn) {
    return AsyncData.flatMap(data => {
        const result = mapFn(data);
        if (result === undefined) {
            // TS will require a cast to AsyncData<TData, any> here.
            return this;
        }
        return AsyncData.Error(result);
    });
};
```

Actual TS Type:

```typescript
interface AsyncData<TData, TError> {
    mapDataToMaybeError<TMappedError>(
        mapFn: (data: TData) => (TMappedError | void)
    ): AsyncData<TData, TMappedError>;
}
```

You could also use try/catch, but in Typescript caught errors are always of type `any` because `throw undefined` is a valid statement. (or more generally, you can `throw` anything.)
