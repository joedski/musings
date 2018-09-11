import cx from 'classnames'
import { h, app } from 'hyperapp'

const state = {
  todos: {
    items: [
      todoItem('Foo'),
    ],
    // We can only edit one thing at a time,
    // so this gets a local-top-level mutex.
    currentEditing: null,
  },
  list: {
    current: 'all',
  },
}

function todoItem(task) {
  return {
    task,
    done: false,
  }
}

const actions = {
  // As seen in their readme...
  getState: () => state => state,
  todos: {
    add: task => state => ({ items: [...state.items, todoItem(task)] }),
    toggleDone: todoId => state => ({
      items: state.items.map((todo, i) => (
        i === todoId ? { ...todo, done: ! todo.done } : todo
      )),
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
  },
  list: {
    show: list => () => ({ current: list }),
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
      h('button', { class: 'destroy' })
    ]),
    h('form', {
      onsubmit: e => {
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
  h('section', { class: 'todoapp' }, [
    h('header', { class: 'header' }, [
      h('h1', {}, 'todos'),
      h('form', {
        onsubmit: (e) => {
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
      h('ul', { class: 'todo-list' }, state.todos.items.map((item, id) =>
        h(Item, { item, id })
      )),
    ])
  ])
)

const boundActions = app(state, actions, view, document.getElementById('app'))

window.$todo = boundActions
