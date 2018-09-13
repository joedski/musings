import { h, app } from 'hyperapp'
import * as asyncComponentUtils from './asyncComponentUtils'
import someComponent from './components/someComponent'

const state = {
  [asyncComponentUtils.STATE_KEY]: asyncComponentUtils.initState(),
}

const actions = {
  [asyncComponentUtils.STATE_KEY]: asyncComponentUtils.actions,
}

const view = (state, actions) => (
  h('section', { class: 'app' }, [
    h(someComponent, {
      message: 'howdy',
    }),
  ])
)

const $app = app(state, actions, view, document.getElementById('app'))

window.$app = $app
