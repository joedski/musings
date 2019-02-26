const utils = require('./utils')

// Permutations of a single genfn
// This basically (Generator<T> -> Generator<T[]>).
function *eachPermutation1(fn0) {
  for (const res0 of fn0())
    yield [res0]
}

const arrs = [
  [1, 2, 3],
]

const arrsFns = arrs.map(utils.genFnOfArray)

console.log(utils.leadInMessage(arrs))

for (const ps of eachPermutation1(arrsFns[0])) {
  console.log(`[${ps.join(', ')}]`)
}
