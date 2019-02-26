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
  if (! fns || ! fns.length) {
    return
  }

  const gens = fns.map(fn => fn())
  const reses = gens.map(gen => gen.next())

  // if any are done by the time we reiterate, we're done.
  // This also catches any gens that don't yield any results
  // before terminating.
  while (! reses.some(res => res.done)) {
    // .map ensures a new array each iteration.
    yield reses.map(res => res.value)

    for (let n = fns.length - 1; ; --n) {
      // If we would "overflow" the first generator, we're done,
      // terminate the generator.
      if (n < 0) return

      reses[n] = gens[n].next()

      if (reses[n].done) continue
      else break
    }

    for (let n = 0, l = fns.length; n < l; ++n) {
      if (reses[n].done) {
        gens[n] = fns[n]()
        reses[n] = gens[n].next()
      }
    }
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
