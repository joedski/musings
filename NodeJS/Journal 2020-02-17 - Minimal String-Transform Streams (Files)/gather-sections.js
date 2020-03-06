const stream = require('stream');

process.stdin
.pipe(bufferToString(toUtf8))
.pipe(split(/\r?\n/))
.pipe(tagLines())
.pipe(collectSections())
.pipe(objectToString(record => (
  JSON.stringify(record, null, 2) + '\n'
)))
.pipe(process.stdout)
.on('error', error => {
  console.error(error);
  process.exit(0);
});

// Main stuff.

// Duplex<string, LineEntity>
function tagLines() {
  return new stream.Transform({
    objectMode: true,
    transform(line, encoding, callback) {
      const type = (() => {
        if (/^\s*.+:\s*$/.test(line)) {
          return 'PREFACE_SECTION_HEADER';
        }

        if (/^\s*(?:[0-9]+\.)+.*\s*$/.test(line)) {
          return 'MAIN_SECTION_HEADER';
        }

        return 'CONTENT';
      })();

      callback(null, { type, line });
    },
  });
}

// Duplex<LineEntity, SectionEntity>
function collectSections() {
  return new stream.Transform({
    objectMode: true,
    transform(lineEntity, encoding, callback) {
      switch (lineEntity.type) {
        case 'MAIN_SECTION_HEADER':
        case 'PREFACE_SECTION_HEADER': {
          if (this.__section != null) {
            this.push(this.__section);
          }

          this.__section = {
            header: lineEntity,
            content: [],
          };

          break;
        }

        default: {
          if (this.__section == null) {
            // Just discard this content, because we're not
            // in a section yet.
            break;
          }

          this.__section.content.push(lineEntity);
        }
      }

      callback();
    },
    flush(callback) {
      if (this.__section != null) {
        callback(null, this.__section);
      } else {
        callback();
      }
    },
  });
}

// Other sundry things.

// (Buffer, StringEncoding) -> string
function toUtf8(chunk, encoding) {
  if (Buffer.isBuffer(chunk)) {
    return chunk.toString('utf8');
  }
  else if (typeof chunk === 'string' && encoding === 'utf8') {
    return chunk;
  }

  return Buffer.from(chunk, encoding).toString('utf8');
}

// ((Buffer, StringEncoding) -> string) -> Duplex<Buffer, string>
function bufferToString(decodeBuffer) {
  return new stream.Transform({
    transform(chunk, encoding, callback) {
      callback(null, decodeBuffer(chunk, encoding));
    },
  });
}

// RegExp -> Duplex<string, string>
/**
 * Collect and concatenate string data into a single string
 * then emit chunks of the string by repeatedly trying to
 * match using the provided regex, and splitting on that match.
 * @param  {RegExp} testRe Pattern to split on.
 * @return {Duplex<string, string>} A Duplex stream where the
 *                                  Readable part is in Object Mode.
 */
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
    flush(callback) {
      // Since we eagerly split the incoming data, we assume the
      // remainder does not have any matches to split on.
      // So, just spit it out.
      if (typeof this.__buffer != 'string') {
        callback();
        return;
      }

      callback(null, this.__buffer);
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
