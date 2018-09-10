import { h, app } from 'hyperapp'

const state = {
  todos: [],
  list: 'all',
}

function todoItem(task) {
  return {
    task,
    done: false,
  }
}

const actions = {
  todos: {
    add: task => state => ({ todos: [...state.todos, todoItem(task)] }),
    toggleDone: taskId => state => ({
      todos: state.todos.map((todo, i) => (
        i === taskId ? { ...todo, done: ! todo.done } : todo
      )),
    }),
    delete: taskId => state => ({
      todos: state.todos.filter((todo, i) => i !== taskId),
    }),
  },
  list: {
    show: list => () => ({ list }),
  },
}

const view = (state, actions) => (
  h('section', { class: 'todoapp' }, 'hello')
)

app(state, actions, view, document.getElementById('app'))
