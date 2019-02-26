function genFnOfArray(arr) {
  return function *$genFnOfArray() {
    let i = 0
    while (i < arr.length) {
      yield arr[i]
      ++i
    }
  }
}

function leadInMessage(arrs) {
  return `Permutations of ${JSON.stringify(arrs)}:`
}

Object.assign(exports, {
  genFnOfArray,
  leadInMessage,
})
