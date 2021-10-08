// @ts-check

const stream = require("stream");
const { createPrivateStore } = require("../util/private.js");

// () -> Duplex<string, string>
/**
 * Buffers all incoming data into a single value and flushes it
 * when upstream is ended.
 *
 * - Mode: Object(string) -> Object(string)
 * @return {import('stream').Duplex} A Duplex stream where the
 *                                  Readable part is in Object Mode.
 */
exports.collectString = function collectString() {
  const streamCollectionBuffer = createPrivateStore(() => "");

  return new stream.Transform({
    objectMode: true,
    decodeStrings: false,
    transform(chunk, encoding, callback) {
      streamCollectionBuffer.set(
        this,
        streamCollectionBuffer.get(this) + chunk
      );
      callback();
    },
    flush(callback) {
      callback(null, streamCollectionBuffer.get(this));
    },
  });
};
