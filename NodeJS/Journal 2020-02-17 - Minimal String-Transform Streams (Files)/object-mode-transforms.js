const stream = require('stream');

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

function dataToUtf8(chunk, encoding) {
  if (Buffer.isBuffer(chunk)) {
    return chunk.toString('utf8');
  }
  else if (typeof chunk === 'string' && encoding === 'utf8') {
    return chunk;
  }

  return Buffer.from(chunk, encoding).toString('utf8');
}

// () -> Duplex<Buffer, string>
function dataToString() {
  return new stream.Transform({
    transform(chunk, encoding, callback) {
      callback(null, dataToUtf8(chunk, encoding));
    },
  });
}

// RegExp -> Duplex<string, string>
function split(testRe) {
  return new stream.Transform({
    readableObjectMode: true,
    decodeStrings: false,
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

// () -> Duplex<string, Blather>
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

// <T>: (T -> string) -> Duplex<T, string>
function objectToString(toString) {
  return new stream.Transform({
    writableObjectMode: true,
    // NOTE: since incoming is object mode, encoding is ignored.
    transform(chunk, encoding, callback) {
      callback(null, toString(chunk));
    },
  });
}
