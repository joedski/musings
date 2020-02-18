Journal 2020-02-17 - Minimal String-Transform Streams
========

Probably a better place to start before diving into things like JSON processing: operating on string input, with an assumption (heh!) of utf-8 input and output.

> NOTE: Honestly, for any general utils, that's not a good assumption to make, but without implementing some sort of guessing logic you have to start somewhere.  The best option would be to make that a parameter that can be changed on the command line.



## Simplest-Most: Transform-Only, No Manual Buffering

The simplest-most is to operate on the input and not engage in any manual buffering.  This only allows for trivial transforms, of course, but it makes an excellent introduction.

```js
const stream = require('stream');

function dataToUtf8(chunk, encoding) {
    if (Buffer.isBuffer(chunk)) {
        return chunk.toString('utf8');
    }
    else if (typeof chunk === 'string' && encoding === 'utf8') {
        return chunk;
    }

    return Buffer.from(chunk, encoding).toString('utf8');
}

function dataToString() {
    return new stream.Transform({
        transform(chunk, encoding, callback) {
            callback(null, dataToUtf8(checkn, encoding));
        },
    });
}
```

From there, you can implement anything you want.

```js
function transformText(transformFn) {
    return new stream.Transform({
        transform(chunk, encoding, callback) {
            try {
                const transformed = transformFn(chunk, encoding);
                callback(null, transformed);
            }
            catch (error) {
                callback(error);
            }
        },
    });
}

const transformUpperCase = () => transformText(s => s.toUpperCase());

const s = process.stdin
.pipe(transformUpperCase())
.pipe(process.stdout)

s.on('error', error => {
    console.error(error);
    process.exit(1);
});
```
