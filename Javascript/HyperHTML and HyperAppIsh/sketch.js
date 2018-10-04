import hh from 'hyperhtml'

// Main interface.
function html(...args) {
  if (Array.isArray(args[0])) {
    return {
      strings: args[0],
      values: args[1]
    }
  }

  const props = (
    typeof args[0] === 'object' && args[0]
      ? args[0]
      : {}
  )

  return (strings, ...values) => ({
    ...props,
    strings,
    values,
  })
}

function isContent(obj) {
  return (
    obj
    && (typeof obj === 'object')
    && Array.isArray(obj.strings)
    && ('values' in obj)
  )
}

// We don't want to pollute the node itself, so we use a map.
const $elMeta = new WeakMap()

function getElMeta(el) {
  if (! $elMeta.has(el)) {
    $elMeta.set(el, {
      rootVnode: {
        // It's fine to always create a new array since
        // that will guarantee it's different from any
        // interned template-strings array.
        strings: [],
        values: [],
      }
    })
  }

  return $elMeta.get(el)
}



// Rendering!
// ----------

function normalizeVnode(vnode, state, actions) {
  // ??

  // if (typeof vnode === 'function') {
  //   return vnode(state, actions)
  // }
}

function patch(el, rootVnode, state, actions) {
  const elMeta = getElMeta(el)
  const actualRootVnode = normalizeVnode(rootVnode, state, actions)
}
