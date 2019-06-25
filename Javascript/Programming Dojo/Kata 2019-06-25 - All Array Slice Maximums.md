Kata 2019-06-25 - All Array Slice Maximums
========

Given an array of integers and a number k, where 1 <= k <= length of the array, compute the maximum values of each subarray of length k.

For example, given `array = [10, 5, 2, 7, 8, 7]` and `k = 3`, we should get: `[10, 7, 8, 8]`, since:

- 10 = max(10, 5, 2)
- 7 = max(5, 2, 7)
- 8 = max(2, 7, 8)
- 8 = max(7, 8, 7)



## My First Solution: Inefficient, but Correct

- Allocations:
    - 2 arrays for output (slice, map).
    - (Length - (k - 1)) arrays while processing: 1 array per slice.
    - 1 function for map, closes over the input array.
- Calls:
    - `Math.max()`: Length - (k - 1) calls, 1 call per slice.
    - Iteratee to map: Length - (k - 1) calls, 1 call per slice.
        - It's really just a parametrizer for the above `Math.max()` calls.

```js
function maxesOfSlices(k, a) {
  return a
    .slice(0, a.length - k + 1)
    .map((_, i) => Math.max(...a.slice(i, i + k)))
    ;
}
```



## Second Solution: Possibly More Efficient

- Allocations:
    - 1 array for output.
- Calls:
    - `Math.max()`: (k - 1) * (Length - (k - 1)) calls, 1 call per overlapping pair in each slice.

```js
function maxesOfSlices(k, a) {
  const r = a.slice();
  r.length = a.length - k + 1;
  for (let start = 0; start < r.length; ++start) {
    const end = start + k;
    for (let i = start + 1; i < end; ++i) {
      r[start] = Math.max(r[start], a[i]);
    }
  }
  return r;
}
```
