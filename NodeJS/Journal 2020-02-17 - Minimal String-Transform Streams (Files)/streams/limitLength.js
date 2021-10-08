// @ts-check

const stream = require("stream");
const { createPrivateStore } = require("../util/private.js");

/**
 * Counts the bytes/octets coming in, and throws an error that count exceeds
 * the specified maximum.
 *
 * - Mode: Buffer -> Buffer
 * @param {number} maxByteLength Maximum byte length past which an error should be thrown.
 */
exports.limitLength = function limitLength(maxByteLength) {
  const bufferBytes = createPrivateStore(() => 0);

  return new stream.Transform({
    objectMode: false,
    decodeStrings: false,
    transform(chunk, encoding, callback) {
      const prevTotalBytes = bufferBytes.get(this);
      const nextBytes = Buffer.of(chunk).byteLength;

      if (prevTotalBytes + nextBytes > maxByteLength) {
        callback(new Error(`Input exceeded limit of ${maxByteLength}KB`));
        return;
      }

      bufferBytes.set(this, prevTotalBytes + nextBytes);

      callback(null, chunk);
    },
    flush(callback) {
      callback();
    },
  });
};
