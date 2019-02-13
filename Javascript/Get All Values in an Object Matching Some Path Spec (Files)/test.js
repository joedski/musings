const assert = require('assert')
const getAll = require('./index.js')

assert(
  Array.isArray(getAll({a: 'foo'}, ['a'])),
  `getAll() should return an array`
)

assert.deepEqual(
  getAll({ a: 'foo', b: 'bar' }, ['a']),
  ['foo']//,
  // `getAll() should return values according to string pathSpec elements`
)

assert.deepEqual(
  getAll({ a: { b: 'bar' } }, ['a', 'b']),
  ['bar']//,
  // `getAll() should return values from deep in the target according to string pathSpec elements`
)

assert.deepEqual(
  getAll({ a: 'foo', b: 'bar', abc: 'baz' }, [(k) => (k.length === 1)]),
  // NOTE: assumes keys are iterated in order of appearance in the literal.
  ['foo', 'bar']//,
  // `getAll() should return values according to function pathSpec elements`
)
