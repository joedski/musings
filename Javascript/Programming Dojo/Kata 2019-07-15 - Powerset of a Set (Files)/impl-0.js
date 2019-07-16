function* powerSequence(n) {
  const target = 2 ** n;
  for (let a = 0; a < target; ++a) {
    yield a;
  }
}

function* bitfieldIndices(bitfield) {
  for (
    let s = 0, n = bitfield;
    n > 0;
    ++s, n = n >> 1
  ) {
    if (n & 1) yield s;
  }
}

module.exports = powerset;
function powerset(s) {
  const result = new Set();
  const elemsInOrder = [...s];

  for (const bitfield of powerSequence(s.size)) {
    const powersetElem = new Set();
    result.add(powersetElem);

    for (const index of bitfieldIndices(bitfield)) {
      powersetElem.add(elemsInOrder[index]);
    }
  }

  return result;
}
