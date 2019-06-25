module.exports = maxesOfSlices;
function maxesOfSlices(k, a) {
  const r = a.slice();
  r.length = a.length - k + 1;
  for (let start = 0; start < r.length; ++start) {
    const end = start + k;
    for (let i = start + 1; i < end; ++i) {
      r[start] = Math.max(r[start], a[i]);
    }
  }
  return r;
}
