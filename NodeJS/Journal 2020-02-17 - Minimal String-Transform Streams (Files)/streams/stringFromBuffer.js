// @ts-check

const stream = require("stream");

/**
 * Creates a string/buffer decoder that translates a given chunk to a string
 * of the specified encoding.
 * @param {BufferEncoding} targetEncoding
 */
exports.toEncoding = function toEncoding(targetEncoding) {
  /**
   *
   * @param {Buffer | string} chunk
   * @param {BufferEncoding} encoding
   * @returns
   */
  function $toEncoding(chunk, encoding) {
    if (Buffer.isBuffer(chunk)) {
      return chunk.toString(targetEncoding);
    }

    if (encoding === targetEncoding) {
      return chunk;
    }

    return Buffer.from(chunk, encoding).toString(targetEncoding);
  }

  return $toEncoding;
};

/**
 * Most common use case: translate to utf8, otherwise known as "normal JS strings".
 */
exports.toUtf8 = exports.toEncoding("utf8");

// ((Buffer, StringEncoding) -> string) -> Duplex<Buffer, string>
/**
 * Translate chunks from buffers or strings to strings using the specified
 * buffer decoder.
 *
 * NOTE: It's necessary for downstream writables to have their write-side in
 * object mode or else the strings will be automatically turned back into Buffers.
 *
 * - Mode: Buffer -> Object(string)
 * @param {(chunk: Buffer | string, encoding: BufferEncoding) => string} decodeBuffer
 * @returns {import('stream').Transform}
 */
exports.stringFromBuffer = function stringFromBuffer(decodeBuffer) {
  return new stream.Transform({
    readableObjectMode: true,
    transform(chunk, encoding, callback) {
      callback(null, decodeBuffer(chunk, encoding));
    },
  });
};
