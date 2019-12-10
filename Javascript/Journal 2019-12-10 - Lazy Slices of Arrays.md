Journal 2019-12-10 - Lazy Slices of Arrays
========

How to slice large collections without creating a new array in memory until you actually need it?  There's probably entire libraries built around this already and, in an actual product, I might put some research into that.  For now, I'm just exploring the concept here.

Also, Transducers might be something to look at as well.



## Initial Thought

A slice is just any contiguous run of elements of an array, starting at some index and ending at some other one.

So, you could store it as either Start + Length or Start + End.  Not sure which is better just yet.

```js
function *iterateSlice(slice) {
    const { array, start, end } = slice;
    for (let i = start; i < end; ++i) {
        yield array[i];
    }
}

class Slice {
    constructor(array, start, end) {
        this.array = array;
        this.start = start;
        this.end = end;
    }

    get length() {
        return this.end - this.start;
    }

    [Symbol.iterator]() {
        return iterateSlice(this);
    }
}
```
