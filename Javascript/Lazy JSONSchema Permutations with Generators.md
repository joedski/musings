Lazy JSONSchema Permutations with Generators
============================================

Premise:

- We have a JSONSchema description of some Object.
- Some Properties on that Object may be either Enums, or Objects like this Object, or Arrays whose Items are Objects like this Object.
- There could be A Lot of Enums in the entire tree.
- Bonus Points if this can be extended to cover `oneOf` or `anyOf` type validations, but we're not going to deal with that yet.

Initial Thoughts:

- A Generator Function creates an Generator, and Generators implement the Iterator protocol.
    - To specialize a Generator Function then, we should use either Thunks or some Object thing.  Anything that couples the target parameters with the target Generator.
- An Object Generator should be reusable for an Object Property.
- An Array Generator should be a switch that itself may use the Object Generator.  Otherwise it just uses the single value.
- A Single Property doesn't need a Generator, and for efficiency reasons should probably just be treated as a literal.

That's a lot to handle, but I think if we can tackle the Primitive Property Enum case first, then we can naturally extend that same machinery to Object Property case, then to the Array Property case.

Suppose then we start with the simplest case, no Enums, no Objects, no Arrays.  We should have a Generator with yields a single value before returning.

```js
function *forEachOfSchema(schema) {
  if (Array.isArray(schema.enum)) {
    yield* forEachOfEnumScema(schema)
    return
  }

  switch (schema.type) {
    case 'string':
    case 'boolean':
    case 'number':
      yield* forEachPrimitiveValueOfSchema(schema)
      break

    case 'object':
      yield* forEachOfObjectSchema(schema)
      break

    case 'array':
      yield* forEachOfArraySchema(schema)
      break

    default:
      break
  }
}

function *forEachOfEnumScema(schema) {
  for (const value of schema.enum) yield value
}

function *forEachPrimitiveValueOfSchema(schema) {
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

function *forEachOfObjectSchema(schema) {
  // TODO: should check against required, then take that into account:
  // Optional props should not only iterate over values,
  // but also include "not included" in the iteration.
}

function *forEachOfArraySchema(schema) {
  // TODO: ... anything, yeah.
  // This'll fail any schema that specifies min >= 1.
  yield []
  return
}
```

In the basic most operation, we just need to check each property and generate a value for it.  Keep generating until we run out of permutations.


### Permutations

Permutations are also something we should consider generating, since they're kinda annoying to keep in memory and, anyway, we're trying to use generators.  We can't not use generators here.  I mean, we can, but meh.

Before we get all caught up in generators with generators, let's start with a more descriptive idea of what we're trying to do:

- We want to create an Object for each permutation of Props, especially for Enums.
- We want to create things as lazily as possible.

So, even creating permutations of generators isn't really want we want.  But... Maybe we could just create a generator which itself creates all permutations of a set of generators?  Hm.

A Generator Function is any function which returns a Generator, in much the same way an Async Function is any Function which returns a Promise. (more or less...)  Meaning, for `function *foo() {}`, `foo()` is the same as `(() => foo())()`.

How about this, then?

- Create a Generator for each Property.
- Create a Generator around this collection of Generators.
- This outer Generator will then handle iterating over every permutation of the inner generators' iterators.

Alright, how do we accomplish that, then?  I decided to tackle that in a [separate line of thought](./Generators%20-%20Permutations.md), though that separate line of thought was specifically started by this one.

The rest of it is pretty easy then: We just iterate over the listed Properties and create a Generator Function for each along with a corresponding Generator-Function-Index-to-Property-Name mapping to parametrize the actual underlying factory function.

This then becomes basically a mapping of Permutations to Objects.  Huzzah.


### Object Factory

This is the easier part.  We just iterate over `Object.entries(schema.properties)`, creating two arrays: An Array of Generator Functions and an Array of Property Names to map indices to said Property Names.

