Journal 2019-10-22 - Processing JSON Input from Stdin
========

Gonna try to build up a minimal, not very robust streams based way to process JSON from stdin.

At a high level, we just need to consume all input, try to parse it as JSON, do stuff with that, then write to the output.  This should be doable with a Transform stream.



## Basic Smoketest: Passthrough

We should be able to create a passthrough/JSON formatter by just parsing the input, then immediately restringifying it writing it back out.  But with indents!

```js
// should use the npm module, but meh.
const stream = require('stream');

const formatJsonStream = new stream.Transform({
  transform(chunk, encoding, callback) {
    this.collectedData = this.collectedData || ''

    if (Buffer.isBuffer(chunk)) {
      this.collectedData += chunk.toString('utf8');
    }
    else if (typeof chunk === 'string') {
      this.collectedData += Buffer.from(chunk, encoding).toString('utf8');
    }

    callback(null);
  },

  flush(callback) {
    try {
      const parsedData = JSON.parse(this.collectedData);
      const reserializedData = JSON.stringify(parsedData, null, 2) + '\n';
      callback(null, reserializedData);
    }
    catch (error) {
      callback(error);
    }
  },
});

process.stdin
.pipe(formatJsonStream)
.pipe(process.stdout)
;

formatJsonStream.on('error', error => {
  console.error(error);
  process.exit(1);
});
```

Easy squeezy.  In fact, with that we can wrap whatever we want in there:

```js
// should use the npm module, but meh.
const stream = require('stream');

function transformJsonStream(jsonTransformFunction) {
  return new stream.Transform({
    transform(chunk, encoding, callback) {
      this.collectedData = this.collectedData || ''

      if (Buffer.isBuffer(chunk)) {
        this.collectedData += chunk.toString('utf8');
      }
      else if (typeof chunk === 'string') {
        this.collectedData += Buffer.from(chunk, encoding).toString('utf8');
      }

      callback(null);
    },

    flush(callback) {
      try {
        const parsedData = JSON.parse(this.collectedData);
        const reserializedData = jsonTransformFunction(parsedData) + '\n';
        callback(null, reserializedData);
      }
      catch (error) {
        callback(error);
      }
    },
  });
}

const reindentJsonStream = transformJsonStream(json => JSON.stringify(json, null, 2))

process.stdin
.pipe(reindentJsonStream)
.pipe(process.stdout)
;

reindentJsonStream.on('error', error => {
  console.error(error);
  process.exit(1);
});
```

Or even more general:

```js
// should use the npm module, but meh.
const stream = require('stream');

function slurpStringTransformStream(transformFunction) {
  return new stream.Transform({
    transform(chunk, encoding, callback) {
      this.collectedData = this.collectedData || ''

      if (Buffer.isBuffer(chunk)) {
        this.collectedData += chunk.toString('utf8');
      }
      else if (typeof chunk === 'string') {
        if (encoding === 'utf8') {
          this.collectedData += chunk;
        }
        else {
          this.collectedData += Buffer.from(chunk, encoding).toString('utf8');
        }
      }

      callback(null);
    },

    async flush(callback) {
      try {
        const transformedData = await transformFunction(this.collectedData);
        callback(null, reserializedData);
      }
      catch (error) {
        callback(error);
      }
    },
  });
}

function transformJsonStream(jsonTransformFunction) {
  return slurpStringTransformStream(stringData => {
    const parsedData = JSON.parse(stringData);
    const reserializedData = transformFunction(parsedData) + '\n';
    return reserializedData;
  });
}

const reindentJson = transformJsonStream(json => JSON.stringify(json, null, 2))

stream.pipeline(
  process.stdin,
  reindentJson,
  process.stdout,
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
```

And that's it.  Nice.
