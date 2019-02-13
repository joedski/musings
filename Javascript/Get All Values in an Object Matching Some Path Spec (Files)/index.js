module.exports = getAll

function getAll(target, pathSpec) {
  if (! pathSpec.length) return [target]

  const nextPathElement = pathSpec[0]
  const nextPathSpec = pathSpec.slice(1)

  if (
    typeof nextPathElement === 'number'
    || typeof nextPathElement === 'string'
  ) {
    const nextTarget = target[nextPathElement]
    if (nextTarget === undefined) return []
    return getAll(nextTarget, nextPathSpec)
  }

  if (typeof nextPathElement === 'function') {
    if (Array.isArray(target)) {
      return target.reduce(
        (acc, nextTarget, index) => {
          if (nextPathElement(index, nextTarget)) {
            return acc.concat(getAll(nextTarget, nextPathSpec))
          }
          return acc
        },
        []
      )
    }

    if (target != null && typeof target === 'object') {
      return Object.keys(target).reduce(
        (acc, nextTargetKey) => {
          const nextTarget = target[nextTargetKey]
          if (nextPathElement(nextTargetKey, nextTarget)) {
            return acc.concat(getAll(nextTarget, nextPathSpec))
          }
          return acc
        },
        []
      )
    }
  }

  throw new Error(`${nextPathElement} is not a valid pathSpec element`)
}
