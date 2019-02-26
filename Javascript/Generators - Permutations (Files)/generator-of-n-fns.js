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
  // This is basically how it's implemented in any functional language.
  // TODO: Exercise: Redo with less recursion?
  if (! fns || ! fns.length) {
    return
  }
  else if (fns.length === 1) {
    for (const res0 of fns[0]())
      yield [res0]
  }
  else {
    for (const res0 of fns[0]())
      for (const res1 of eachPermutation(fns.slice(1)))
        yield [res0].concat(res1)
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
