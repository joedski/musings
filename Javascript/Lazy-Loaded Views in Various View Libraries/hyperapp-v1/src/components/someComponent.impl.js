// The actual implementation that gets lazily loaded.
import { h } from 'hyperapp'

export default (props) => (state, actions) => (
  h('div', {}, `async component says ${props.message}!`)
)
