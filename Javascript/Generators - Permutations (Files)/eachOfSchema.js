const { eachPermutation } = require('./eachPermutation')

function *eachOfSchema(schema) {
  if (Array.isArray(schema.enum)) {
    yield* eachOfEnumScema(schema)
    return
  }

  switch (schema.type) {
    case 'string':
    case 'boolean':
    case 'number':
      yield* eachPrimitiveValueOfSchema(schema)
      break

    case 'object':
      yield* eachOfObjectSchema(schema)
      break

    case 'array':
      yield* eachOfArraySchema(schema)
      break

    default:
      break
  }
}

function *eachOfEnumScema(schema) {
  for (const value of schema.enum) yield value
}

function *eachPrimitiveValueOfSchema(schema) {
  switch (schema.type) {
    case 'string':
      // TODO: should fit string constraints.
      yield 'string'
      break

    case 'boolean':
      yield true
      yield false
      break

    case 'number':
      // TODO: should fit number constraints.
      yield 0
      break
  }
}

function *eachOfObjectSchema(schema) {
  // TODO: required, ... other things?  Probably not other things.
  // Not even gonna touch things like allOf/anyOf/oneOf yet.

  if (! schema.properties) {
    yield {}
    return
  }

  const propGeneratorFns = []
  const propNames = []

  Object.entries(schema.properties).forEach(
    ([propName, propSchema], i) => {
      propGeneratorFns[i] = () => eachOfSchema(propSchema)
      propNames[i] = propName
    }
  )

  for (const permutation of eachPermutation(propGeneratorFns)) {
    yield permutation.reduce(
      (acc, value, i) => {
        acc[propNames[i]] = value
        return acc
      },
      {}
    )
  }
}

function *eachOfArraySchema(schema) {
  // TODO: ... anything, yeah.
  // This'll fail any schema that specifies min >= 1.
  yield []
}

Object.assign(exports, {
  eachOfSchema,
  eachOfEnumScema,
  eachPrimitiveValueOfSchema,
  eachOfObjectSchema,
  eachOfArraySchema,
})
