const assert = require('assert')
const { eachOfSchema } = require('./eachOfSchema')

;(function schemaOf2Enums() {
  console.log('schemaOf2Enums ...')

  const schema = {
    type: 'object',
    properties: {
      foo: {
        type: 'string',
        enum: ['foo-1', 'foo-2', 'foo-3'],
      },
      bar: {
        type: 'number',
        enum: [1, 4, 9, 16],
      },
    },
  }

  const schemaResults = [
    { foo: 'foo-1', bar: 1 },
    { foo: 'foo-1', bar: 4 },
    { foo: 'foo-1', bar: 9 },
    { foo: 'foo-1', bar: 16 },
    { foo: 'foo-2', bar: 1 },
    { foo: 'foo-2', bar: 4 },
    { foo: 'foo-2', bar: 9 },
    { foo: 'foo-2', bar: 16 },
    { foo: 'foo-3', bar: 1 },
    { foo: 'foo-3', bar: 4 },
    { foo: 'foo-3', bar: 9 },
    { foo: 'foo-3', bar: 16 },
  ]

  // We can compare results in order because we know these:
  // - eachOfSchema ultimately relies on eachPermutation.
  // - eachPermutation iterates last-iterator-first.
  // - V8 traverses object properties in order of addition,
  //   which for literals means in order of writing.
  // If we didn't take advantage of those, we'd have to treat the
  // results set as a Set rather than an Array.

  let i = 0
  for (const result of eachOfSchema(schema)) {
    const expectedResult = schemaResults[i]
    assert.deepEqual(
      result, expectedResult,
      `Result #${i} of permutations of schema should be ${JSON.stringify(expectedResult)}`
    )
    ++i
  }
})()

;(function schemaOfEnumAndObject() {
  console.log('schemaOfEnumAndObject ...')

  const schema = {
    type: 'object',
    properties: {
      foo: {
        type: 'string',
        enum: ['foo-1', 'foo-2', 'foo-3'],
      },
      bar: {
        type: 'object',
        properties: {
          value: {
            type: 'number',
            enum: [1, 4, 9, 16],
          },
        },
      },
    },
  }

  const schemaResults = [
    { foo: 'foo-1', bar: { value: 1 } },
    { foo: 'foo-1', bar: { value: 4 } },
    { foo: 'foo-1', bar: { value: 9 } },
    { foo: 'foo-1', bar: { value: 16 } },
    { foo: 'foo-2', bar: { value: 1 } },
    { foo: 'foo-2', bar: { value: 4 } },
    { foo: 'foo-2', bar: { value: 9 } },
    { foo: 'foo-2', bar: { value: 16 } },
    { foo: 'foo-3', bar: { value: 1 } },
    { foo: 'foo-3', bar: { value: 4 } },
    { foo: 'foo-3', bar: { value: 9 } },
    { foo: 'foo-3', bar: { value: 16 } },
  ]

  let i = 0
  for (const result of eachOfSchema(schema)) {
    const expectedResult = schemaResults[i]
    assert.deepEqual(
      result, expectedResult,
      `Result #${i} of permutations of schema should be ${JSON.stringify(expectedResult)}`
    )
    ++i
  }
})()

console.log('All Passed!')
