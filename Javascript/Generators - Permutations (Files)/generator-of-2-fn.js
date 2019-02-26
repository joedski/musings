const utils = require('./utils')

// function *eachPermutation2(fn0, fn1) {
//   const itrs = []
//   const results = []

//   itrs[0] = fn0()
//   results[0] = itrs[0].next()
//   while (! results[0].done) {
//     itrs[1] = fn1()
//     results[1] = itrs[1].next()
//     while (! results[1].done) {
//       yield results.map(r => r.value)
//       results[1] = itrs[1].next()
//     }
//     results[0] = itrs[0].next()
//   }
// }

function *eachPermutation2(fn0, fn1) {
  const itrs = []
  const results = []

  for (const res0 of fn0())
    for (const res1 of fn1())
      yield [res0, res1]
}

const arrs = [
  [1, 2, 3],
  ['a', 'b', 'c'],
]

const arrsFns = arrs.map(utils.genFnOfArray)

console.log(utils.leadInMessage(arrs))

for (const ps of eachPermutation2(arrsFns[0], arrsFns[1])) {
  console.log(`[${ps.join(', ')}]`)
}
