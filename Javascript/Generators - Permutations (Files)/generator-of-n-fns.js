const utils = require('./utils')

/**
 * Creates a generator that generates permutations of all values
 * yielded by the array of generator functions handed to it.
 * This only works, of course, if all generator functions
 * create generators of finite length sequences.
 * @param {Array<() => Generator<T>>} fns Array of Generator Functions.
 * @yield {Generator<Array<T>>} Generator that yields values.
 */
function *eachPermutation(fns) {
  // TODO: Exercise: Redo with less recursion?
  if (! fns || ! fns.length) {
    yield []
  }
  else if (fns.length === 1) {
    for (const res0 of fns[0]())
      yield [res0]
  }
  else if (fns.length === 2) {
    for (const res0 of fns[0]())
      for (const res1 of fns[1]())
        yield [res0, res1]
  }
  else {
    // Rephrase in terms of two.
    const rfns = [fns[0], () => eachPermutation(fns.slice(1))]
    for (const result of eachPermutation(rfns))
      yield [result[0]].concat(result[1])
  }
}

const arrs = [
  [1, 2, 3],
  ['a', 'b', 'c'],
  [true, false],
  ['FOO', 'bar', 'BAZ'],
]

const arrsFns = arrs.map(utils.genFnOfArray)

console.log(utils.leadInMessage(arrs))

for (const ps of eachPermutation(arrsFns)) {
  console.log(`${JSON.stringify(ps)}`)
}
