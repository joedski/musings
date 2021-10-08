// @ts-check

const { tap } = require("./tap");

/**
 * Creates a promise on the last value of a stream.  If the stream errors,
 * the promise rejects.
 *
 * Because each stream errors separately, you must add the handler to each error
 * you expect to catch.  For this reason, the reject callback
 *
 * For web servers, that means you really have to catch every single one, which
 * is fun.
 *
 * @param {(handleError: (error: Error) => void) => import('stream').Duplex} getStream
 * @returns {Promise<any>}
 */
exports.promiseLastFromStream = function promiseLastFromStream(getStream) {
  return new Promise((resolve, reject) => {
    let value;
    let rejectionReason;

    const stream = getStream((error) => {
      if (rejectionReason == null) {
        rejectionReason = error;
        reject(error);
      } else {
        console.error("Unexpected error", error);
      }
    });

    const tapper = stream.pipe(
      tap((next) => {
        value = next;
      })
    );

    // I thought this should properly map the error to rejection,
    // but I'm still getting an "Unhandled 'error' event" crash in node.
    tapper.on("finish", () => resolve(value));
  });
};
