module.exports = maxesOfSlices;
function maxesOfSlices(k, a) {
  return a
    .slice(0, a.length - k + 1)
    .map((_, i) => Math.max(...a.slice(i, i + k)))
    ;
}
