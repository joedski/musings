module.exports = [
  {
    args: [new Set([1, 2, 3])],
    // fun fact: nodejs util.isDeepStrictEqual compares Sets (and Maps) as expected.
    result: new Set([
      new Set(),
      new Set([1]),
      new Set([2]),
      new Set([3]),
      new Set([1, 2]),
      new Set([1, 3]),
      new Set([2, 3]),
      new Set([1, 2, 3]),
    ]),
  },
  {
    args: [new Set([0, 'a', {foo: true}, false])],
    result: new Set([
      new Set(),
      new Set([0]),
      new Set(['a']),
      new Set([{foo: true}]),
      new Set([false]),
      new Set([0, 'a']),
      new Set([0, {foo: true}]),
      new Set([0, false]),
      new Set(['a', {foo: true}]),
      new Set(['a', false]),
      new Set([{foo: true}, false]),
      new Set([0, 'a', {foo: true}]),
      new Set([0, 'a', false]),
      new Set([0, {foo: true}, false]),
      new Set(['a', {foo: true}, false]),
      new Set([0, 'a', {foo: true}, false]),
    ]),
  }
];
