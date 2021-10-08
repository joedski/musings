// @ts-check

const stream = require("stream");

exports.tap = function tap(effect, { objectMode = false } = {}) {
  return new stream.Transform({
    readableObjectMode: true,
    decodeStrings: false,
    transform(chunk, encoding, callback) {
      effect(chunk, encoding);
      callback(null, chunk);
    },
    flush(callback) {
      callback();
    },
  });
};
