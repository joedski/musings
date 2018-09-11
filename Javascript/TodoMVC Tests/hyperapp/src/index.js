import cx from 'classnames'
import { h, app } from 'hyperapp'
import { Router } from './vendor/director'

function syncLocalStorage(state) {
  // NOTE: Props overridden with `undefined` are deleted
  // during serialization.  This is intentional.
  const stateToPersist = {
    todos: {
      ...state.todos,
      currentEditing: undefined,
    },
  }

  const stateToPersistSerialized = JSON.stringify(stateToPersist)

  try {
    localStorage.setItem('todomvc.state', stateToPersistSerialized)
  }
  catch (error) {
    console.error('Error trying to persist state to local storage:', error)
  }
}

const state = {
  todos: {
    // TODO: Stop using array indices as ids.
    items: [],
    // We can only edit one thing at a time,
    // so this gets a local-top-level mutex.
    currentEditing: null,
  },
  route: {
    current: 'all',
  },
}

function getTodosLeftCount(state) {
  return state.todos.items.filter(item => ! item.done).length
}

function getCurrentListItems(state) {
  switch (state.route.current) {
    default:
      return state.todos.items

    case 'active':
      return state.todos.items.filter(item => ! item.done)

    case 'completed':
      return state.todos.items.filter(item => item.done)
  }
}

function todoItem(task) {
  return {
    task,
    done: false,
  }
}

const actions = {
  // As seen in their readme, actions that result in no state updates
  // result in no redraws.  If you return the state directly,
  // this results in no updates...
  // This thus allows outside programs to inspect the state.
  // You still have to engage in shenanigannery to know when a redraw occurs, though.
  // Changing the render function (`view` in this particular case)
  // to call a side effect when ever it's called is sufficient,
  // if possibly fine grained.  Could also probably use the various hooks
  // on the top-level element for better discrimination on just what update occurred,
  // eg created vs updated.
  getState: () => state => state,
  hydrate: (stateHydration) => (state, actions) => {
    actions.todos.hydrate(stateHydration.todos)
  },
  todos: {
    hydrate: (stateHydration) => stateHydration,
    add: task => state => ({ items: [...state.items, todoItem(task)] }),
    toggleDone: todoId => state => ({
      items: state.items.map((todo, i) => (
        i === todoId ? { ...todo, done: ! todo.done } : todo
      )),
    }),
    toggleAllDone: () => state => ({
      items: (
        state.items.every(item => item.done)
        ? state.items.map(todo => ({ ...todo, done: false }))
        : state.items.map(todo => ({ ...todo, done: true }))
      ),
    }),
    beginEdit: todoId => ({ currentEditing: todoId }),
    endEdit: (nextTodo) => state => ({
      currentEditing: null,
      items: state.items
        .map((item, id) => (
          nextTodo.id === id ? { ...item, task: nextTodo.task } : item
        ))
        .filter(item => item.task),
    }),
    delete: todoId => state => ({
      items: state.items.filter((todo, i) => i !== todoId),
    }),
    clearCompleted: () => state => ({
      items: state.items.filter(todo => ! todo.done),
    }),
  },
  route: {
    goto: list => ({ current: list }),
  },
}

const Item = ({ item, id }) => (state, actions) => (
  h('li', {
    class: cx({
      completed: item.done,
      editing: state.todos.currentEditing === id,
    }),
  }, [
    h('div', { class: 'view' }, [
      h('input', {
        class: 'toggle',
        type: 'checkbox',
        checked: item.done,
        onchange: () => actions.todos.toggleDone(id),
      }),
      h('label', {
        ondblclick: () => actions.todos.beginEdit(id),
      }, item.task),
      h('button', { class: 'destroy', onclick: () => actions.todos.delete(id) })
    ]),
    h('form', {
      onsubmit: e => {
        // There are more elegant ways to handle this,
        // they involve keeping the state as the single source of truth
        // rather than relying on local state.
        // That is, when ever the input's value changes,
        // that change should be propagated back up to the state
        // rather than left only in the input.
        e.preventDefault()
        if (document.activeElement) document.activeElement.blur()
      },
    }, [
      h('input', {
        class: 'edit',
        value: item.task,
        onupdate: (el) => {
          if (
            state.todos.currentEditing === id
            && document.activeElement !== el
          ) el.focus()
        },
        onblur: (e) => actions.todos.endEdit({ id, task: e.target.value }),
      }),
    ]),
  ])
)

const view = (state, actions) => (
  h('section', { class: 'todoapp', onupdate: () => syncLocalStorage(state) }, [
    h('header', { class: 'header' }, [
      h('h1', {}, 'todos'),
      h('form', {
        onsubmit: (e) => {
          // As noted in Item's form, this would be better handled
          // in hyperapp by tracking the input's current value
          // in the state, thus keeping that the single source of truth.
          // That also opens up the ability for anything to trigger
          // changes to it by calling actions rather than the ad-hoc
          // setup created with this <form>.
          e.preventDefault()
          const newTask = e.target.elements['new-todo-task'].value
          actions.todos.add(newTask)
          e.target.elements['new-todo-task'].value = ''
        }
      }, [
        h('input', {
          name: 'new-todo-task',
          class: 'new-todo',
          placeholder: 'What needs to be done?',
          autofocus: true,
        }),
      ]),
    ]),
    h('section', {
      class: cx('main', { 'hidden': state.todos.items.length <= 0 }),
    }, [
      h('input', {
        id: 'toggle-all',
        class: 'toggle-all',
        type: 'checkbox',
        checked: state.todos.items.every(item => item.done),
        onclick: () => actions.todos.toggleAllDone(),
      }),
      h('label', {
        for: 'toggle-all',
      }, 'Mark all as complete'),
      h('ul', { class: 'todo-list' }, getCurrentListItems(state).map((item, id) =>
        h(Item, { item, id, key: `item-${id}` })
      )),
    ]),
    h('footer', {
      class: cx('footer', { 'hidden': state.todos.items.length <= 0 }),
    }, [
      h('span', { class: 'todo-count' }, [
        h('strong', {}, [`${getTodosLeftCount(state)}`]),
        ` item${getTodosLeftCount(state) === 1 ? '' : 's'} left`,
      ]),
      h('ul', { class: 'filters' }, [
        h('li', {}, [
          h('a', { class: cx({ 'selected': state.route.current === 'all' }), href: '#/' }, 'All'),
        ]),
        h('li', {}, [
          h('a', { class: cx({ 'selected': state.route.current === 'active' }), href: '#/active' }, 'Active'),
        ]),
        h('li', {}, [
          h('a', { class: cx({ 'selected': state.route.current === 'completed' }), href: '#/completed' }, 'Completed'),
        ]),
      ]),
      h('button', {
        class: cx('clear-completed', { 'hidden': state.todos.items.filter(item => item.done).length <= 0 }),
        onclick: () => actions.todos.clearCompleted(),
      }, 'Clear completed'),
    ])
  ])
)

const boundActions = app(state, actions, view, document.getElementById('app'))

// Router Setup

const router = Router({
  '/'() {
    boundActions.route.goto('all')
  },
  '/active'() {
    boundActions.route.goto('active')
  },
  '/completed'() {
    boundActions.route.goto('completed')
  },
})

router.init()

// Local Storage integration
// TODO!

try {
  const persistedStateSerialized = localStorage.getItem('todomvc.state')
  const persistedState = (
    persistedStateSerialized
    ? JSON.parse(persistedStateSerialized)
    : {}
  )
  boundActions.hydrate(persistedState)
}
catch (error) {
  console.error('Error trying to hydrate state from local storage:', error)
}

window.$todo = boundActions
window.$todoRouter = router
