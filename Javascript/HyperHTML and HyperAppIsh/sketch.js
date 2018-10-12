import hh from 'hyperhtml'

const VNODE = Symbol('vnode')

function vnode(strings, values, props) {
  return ({
    props,
    strings,
    values,
    [VNODE]: true,
  })
}

// Main interface.
function html(...args) {
  if (Array.isArray(args[0])) {
    return vnode(args[0], args[1])
  }

  const props = (
    typeof args[0] === 'object' && args[0]
      ? args[0]
      : {}
  )

  return (strings, ...values) => vnode(strings, values, props)
}


// We don't want to pollute the node itself, so we use a map.
const $elMeta = new WeakMap()

function getElMeta(el) {
  if (! $elMeta.has(el)) {
    $elMeta.set(el, {
      rootRepNode: null,
    })
  }

  return $elMeta.get(el)
}



// Rendering!
// ----------

function normalizeVnode(vnode, state, actions) {
  // nullish values are allowed for representing nothing.
  if (vnode == null) return vnode

  // functions are used as injection points for state/actions.
  if (typeof vnode === 'function') {
    return normalizeVnode(vnode(state, actions))
  }

  if (Array.isArray(vnode)) {
    throw new Error('Arrays are not an acceptable Vnode type')
  }

  if (typeof vnode === 'boolean') {
    return null
  }

  if (
    typeof vnode === 'string'
    || typeof vnode === 'number'
    // Covers both Intent Objects and Vnode Objects.
    || typeof vnode === 'object'
  ) {
    return vnode
  }

  console.error('Unrecognized Vnode Type:', vnode)
  throw new Error('Unrecognized Vnode Type')
}

function patch(el, rootVnode, state, actions) {
  const elMeta = getElMeta(el)
  const normalizedRootVnode = normalizeVnode(rootVnode, state, actions)
}
