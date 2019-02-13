Filtering Props with Predicates
===============================

Probably would look something like the following.  Names may need some more thought, but it's probably shorter than JSONSchema.  Functions mean you can get arbitrarily complex, too, though that's not necessarily always a good thing.

```js
// filterPropsBy :: ((v, k) => boolean) => Object => Object

// :: { [k: string]: Object } => { [k: string]: Object }
const filterPropsBySomeSpec = filterPropsBy(objectMatch({
  foo: 'a',
  num: 9,
  // shorthand for objectMatch({...})
  bar: { baz: 'BAZ', bool: true },
  responses: objectAnyPropMatches(objectMatch({
    description: 'OK',
    schema: isObject,
  })),
  someArray: arrayAnyElementsMatch(anyOf([ // aka "or"
    objectMatch(specObject1),
    objectMatch(specObject2),
  ])),
  otherArray: arrayAllElementsMatch(allOf([ // aka "and"
    objectMatch(specObject1),
    objectMatch(specObject2),
  ])),
  restrictiveArray: allOf([
    arrayLength(1),
    arrayAllElementsMatch(objectMatch(someOtherSpecObject)),
  ]),
  someFunc: (v) => isFunction(v),
  has_underscores: (v, k) => k.includes('_'),
  // While doable, it's probably easier to use `v == null`, or basically `isNil`.
  // Depends on how strict you want to be.
  targetLacksProp: (v, k, target) => !(k in target),
}))

const filteredObject = filterPropsBySomeSpec(targetObject)
```

- `objectMatch` takes a spec object where all properties have a predicate that must evaluate to true.
    - Always false if target is not an Object.
    - Only properties in the spec object are checked in the target, all other properties are ignored.
    - Strings, Numbers, Booleans, and Nulls are compared using strict equality.
        - Just to make things simpler, Undefined also is compared using strict equality.
    - Objects are treated as recursive calls to `objectMatch` with the given object-values as the spec object.
    - Functions are treated as Property Predicates.
        - Property Predicates have the following interface: `(propValue, propName: string, target: Object) => boolean`
    - Use `isNil` to treat `null` and `undefined` as the same value.
    - Use `notPresent = (v, k, target) => ! (k in target)` to detect if a property is actually absent.

```js
const objectMatch = spec => target => {
    if (typeof target !== 'object' || target == null) return false
    return Object.entries(spec).every(([key, predicate]) => {
        if (
            typeof predicate === 'string'
            || typeof predicate === 'number'
            || typeof predicate === 'boolean'
            || typeof predicate === 'undefined'
        ) {
            return target[key] === predicate
        }

        if (typeof predicate === 'object') {
            if (predicate == null) return target[key] === predicate
            return objectMatch(predicate)(target[key])
        }

        if (predicate instanceof RegExp) {
            return predicate.test(spec[key])
        }

        if (typeof predicate === 'function') {
            return predicate(target[key], key, target)
        }

        throw new Error(`${predicate} is not a valid property predicate`)
    })
}
```

Non-optimal, though.  This recreates `objectMatch` predicates every time.  Should precompile those.

```js
const isEqual = toValue => target => target === toValue
const regexpMatch = regexp => target => regexp.test(target)

const objectMatch = spec => {
    if (spec == null || typeof spec !== 'object') {
        throw new Error(`objectMatch spec must be an object`)
    }

    const reifiedSpec = Object.entries(spec).map(([key, predicate]) => [
        key,
        (() => {
            if (
                typeof predicate === 'string'
                || typeof predicate === 'number'
                || typeof predicate === 'boolean'
                || typeof predicate === 'undefined'
            ) {
                return isEqual(predicate)
            }

            if (typeof predicate === 'object') {
                if (predicate == null) return isEqual(predicate)
                return objectMatch(predicate)
            }

            if (predicate instanceof RegExp) {
                return regexpMatch(predicate)
            }

            if (typeof predicate === 'function') {
                return predicate
            }

            throw new Error(`${predicate} is not a valid property predicate`)
        })(),
    ])

    return function $objectMatch(target) {
        if (target == null || typeof target !== 'object') return false
        return reifiedSpec.every(([key, predicate]) => (
            predicate(target[key], key, target)
        ))
    }
}
```

Some helpful predicates:

```js
// Asserts that a value is nullish.  Undefined or not present count as nullish.
const isNil = value => value == null
// Asserts that a property is not present.
const isNotPresent = (value, key, target) => !(key in target)
```
