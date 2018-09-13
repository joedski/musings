import { h } from 'hyperapp'
import { AsyncComponent } from '../asyncComponentUtils'

export default AsyncComponent(
  'SomeComponent',
  () => import(/* webpackChunkName: "someComponent" */ './someComponent.impl'),
  {
    renderLoading: () => h('div', { class: '--loading' }, '(loading our component...)'),
    renderError: (error) => (
      h('div', { class: '--error' }, [
        'Error! ',
        error.message,
      ])
    ),
  }
)
