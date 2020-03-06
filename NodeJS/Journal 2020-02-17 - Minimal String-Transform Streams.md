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
            callback(null, dataToUtf8(chunk, encoding));
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



## Less Simple Transforms: To/From Object Mode

The docs didn't say whether or not Transform's constructor options include Duplex's options, even though the same docs say that Transform is a special case of Duplex.  But [some sources](https://www.freecodecamp.org/news/node-js-streams-everything-you-need-to-know-c9141306be93/) indicate this is the case, that it should take the same options as Duplex save for `read` and `write`, so let's try it.

Suppose I want to implement `split()` as a stream, and want to go to Object Mode in order to preserve the string chunks as discrete.

```js
function split(testRe) {
    return new stream.Transform({
        readableObjectMode: true,
        // Writable option: don't do things to input strings.
        // Without this, they get converted back into Buffers
        // which is what we don't want!
        // Note that this is only doable if there's another stream
        // before this one that puts things in the appropriate encoding,
        // and is probably only a good assumption in application code.
        // In general scripts it may be better to just have a
        // normalize function.
        decodeStrings: false,
        // NOTE: Assuming encoding is 'utf8'
        transform(chunk, encoding, callback) {
            if (typeof this.__buffer != 'string') {
                this.__buffer = '';
            }

            this.__buffer += chunk;

            let stillHungry = true;

            while (stillHungry) {
                const match = testRe.exec(this.__buffer);

                if (match == null) {
                    break;
                }

                const beforeSplit = this.__buffer.substr(0, match.index);
                const afterSplit = this.__buffer.substr(beforeSplit.length + match[0].length);

                this.__buffer = afterSplit;
                stillHungry = this.push(beforeSplit);
            }

            callback();
        },
    });
}
```

Obviously to do anything with piping back to stdout, we'll need to somehow go back to string/buffer data.

```js
function objectToString(toString) {
    return new stream.Transform({
        writableObjectMode: true,
        // NOTE: since incoming is object mode, encoding is ignored.
        transform(chunk, encoding, callback) {
            this.callback(null, toString(chunk));
        },
    });
}
```

But in between there, we can now do many things:

```js
function blather() {
    return new stream.Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
            const blatherAboutChunk = {
                length: chunk.length,
                stringified: JSON.stringify(chunk),
            };

            callback(null, blatherAboutChunk);
        },
    });
}
```

Then splat them together:

```js
process.stdin
.pipe(dataToString())
.pipe(split(/\n/))
.pipe(blather())
.pipe(objectToString(
    blah => `Length: ${blah.length}, Content: ${blah.stringified}\n`
))
.pipe(process.stdout)
.on('error', error => {
    console.error(error);
    process.exit(1);
});
```

This seems to work a treat, so that's good.



## Duplex Streams?

So, the above works fine which is cool.  Where do Duplex streams come in, then?

It's stated in the docs that Dulpex streams are for things where the input and output are not necessarily related, such as TCP sockets.  It seems like it would be odd that input and output wouldn't be related even in something like a TCP socket, as otherwise what's the point of opening one?

I think what they mean by that then is: Transforms are a specific subset of Duplexes where the application code itself controls the underlying resource and input-output correlation, while for Duplexes this is not necessarily the case.

That is to say, with a Transform, the application itself which defines the stream is the one that also defines and controls the underlying data processing for the stream.  Whereas with a Duplex, that is not necessarily the case, and it could for instance be wrapping around some external resource as a TCP connection to a somewhere else, and it's that somewhere else that does the actual data manipulation.

That's not to say a Duplex doesn't do data processing, but rather it only defines how to process data written to it before sending it to the underlying resource (eg TCP connection) and how to process data that the underlying resource then spits back out before sending that data on to the next stream.  The actual underlying process however is still a black box within that underlying resource.

With a Transform, the underlying resource is not a black box, but the application itself defines it.
