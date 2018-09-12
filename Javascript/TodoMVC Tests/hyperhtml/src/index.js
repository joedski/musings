import 'todomvc-app-css/index.css';
import cx from 'classnames';
import hyper from 'hyperhtml';
import { skipRepeats, scan, tap, runEffects, MulticastSource, never } from '@most/core';
import * as most from '@most/core';
import { newDefaultScheduler } from '@most/scheduler';



// Setup...

const appEl = document.getElementById('app');
const appScheduler = newDefaultScheduler();



// Events...

// Could call Stream#event directly, but we'd really end up just
// creating the wrapper function anyway, so might as well just do that.
// Basically copy/pasted from here:
//   https://github.com/briancavalier/mostcore-todomvc/blob/master/src/eventAdapter.js
const [dispatch, appActions] = ((scheduler) => {
  const appEventStream = new MulticastSource(never());
  return [
    action => appEventStream.event(scheduler.currentTime(), action),
    appEventStream,
  ];
})(appScheduler);



// Model...

/**
 * :: Stream AppState
 */
const appModel = skipRepeats(scan(
  (state, action) => action(state),
  {
    newTodo: {
      value: '',
      nextId: 0,
    },
    todos: [],
    // Currently, this is mutexed, so we only store it
    // once in the global app state,
    // rather than per todo.
    todoCurrentlyEditing: {
      id: null,
      value: '',
    },
    currentList: 'all',
  },
  appActions
));

function createTodo(id, value) {
  return {
    id,
    value,
    completed: false,
  };
}

// Model: Actions
// Going of the most+react example, these look rather like how
// hyperapp itself works... Albeit I removed a layer of abstraction
// for the sake of expediency (laziness).

const actions = {
  newTodo: {
    change: value => state => ({ ...state, newTodo: { ...state.newTodo, value }}),
    add: () => state => ({
      ...state,
      newTodo: {
        ...state.newTodo,
        value: '',
        nextId: state.newTodo.nextId + 1,
      },
      todos: [
        ...state.todos,
        createTodo(state.newTodo.nextId, state.newTodo.value),
      ],
    }),
  },
  todos: {
    toggleAll: () => state => ({
      ...state,
      todos: (
        state.todos.every(todo => todo.completed)
        ? state.todos.map(todo => ({ ...todo, completed: false }))
        : state.todos.map(todo => (
          todo.completed ? todo : { ...todo, completed: true }
        ))
      ),
    }),
    toggle: todoId => state => ({
      ...state,
      todos: state.todos.map(todo => (
        todo.id === todoId
          ? { ...todo, completed: ! todo.completed }
          : todo
      )),
    }),
    // Calls save first before editing, because
    // editing is mutex and any action that initiates an edit
    // may have to assume that the previous edit
    // was not finished, and edits are meant to
    // always go through (there's currently no way to "cancel" an edit
    // without updating the value.  Technically therefore
    // we could just update the value directly.)
    // NOTE: Although I don't know of any browser that emits
    // focus on the second element before emitting blur on the first
    // technically the order is implementation specific.
    // (just like technically there was no defined order for
    // keys on JS Objects, even though everyone pretty much
    // gave them the order of "by insertion" with certain exceptions.)
    edit: todoId => state => (
      state = actions.todos.save()(state),
      (state.todos.find(todo => todo.id === todoId) != null
        ? {
          ...state,
          todoCurrentlyEditing: {
            ...state.todoCurrentlyEditing,
            id: todoId,
            value: state.todos.find(todo => todo.id === todoId).value,
          }
        }
        : state
      )
    ),
    editChange: value => state => (
      state.todoCurrentlyEditing.id != null
        ? {
          ...state,
          todoCurrentlyEditing: {
            ...state.todoCurrentlyEditing,
            value,
          },
        }
        : state
    ),
    // Calling save more than once is the same as calling it once,
    // and if no edit is pending it's a no-op.
    save: () => state => (
      state.todoCurrentlyEditing.id != null
        ? {
          ...state,
          todos: state.todos.map(todo => (
            todo.id === state.todoCurrentlyEditing.id
              ? { ...todo, value: state.todoCurrentlyEditing.value }
              : todo
          )),
          todoCurrentlyEditing: {
            id: null,
            value: '',
          },
        }
        : state
    ),
  },
};



/**
 * This function actually flushes changes to the DOM,
 * by calling `hyperHTML.bind` on the root element.
 *
 * hyperHTML itself keeps things performant by caching under the hood
 * based on both the template string-parts inputs and
 * the actual argument/interpolation inputs.
 */
const redraw = dispatch => state => {
  hyper.bind(appEl)`<section class="todoapp">
    <header class="header">
      <h1>todos</h1>
      <form
        onsubmit=${(event) => {
          event.preventDefault();
          dispatch(actions.newTodo.add());
        }}
      >
        <input
          value=${state.newTodo.value}
          onchange=${event => dispatch(actions.newTodo.change(event.target.value))}
          type="text"
          name="new-todo"
          class="new-todo"
          placeholder="What needs to be done?"
        />
      </form>
    </header>
    <section class=${cx('main', { hidden: state.todos.length <= 0 })}>
      <input
        type="checkbox"
        id="toggle-all"
        class="toggle-all"
        checked=${state.todos.length && state.todos.every(todo => todo.completed)}
        onclick=${() => dispatch(actions.todos.toggleAll())}
      />
      <label for="toggle-all">Mark all as complete</label>
      <ul class="todo-list">
        ${// Wiring to `dispatch` because it's an unchanging reference.
          // Should probably use something else.
          state.todos.map(todo => hyper.wire(dispatch, `:todo-${todo.id}`)`
          <li
            class=${cx({
              completed: todo.completed,
              editing: state.todoCurrentlyEditing.id === todo.id,
            })}
          >
            <div class="view">
              <input
                type="checkbox"
                class="toggle"
                checked=${todo.completed}
                onclick=${() => dispatch(actions.todos.toggle(todo.id))}
              />
              <label ondblclick=${() => dispatch(actions.todos.edit(todo.id))}>${todo.value}</label>
              <button class="destroy"></button>
            </div>
            <!--
              Not sure if there's a better way to handle this, event wise.
              Probably updating edit values on key down instead of on change
              would simplify things ande make it less susceptible to browser weirdness.
              The lack of lifecycle hooks makes it difficult to do things like
              give the element focus in-line.
              I accomplished this with a post-render check.
            -->
            <input
              type="text"
              class="edit"
              id=${`todo-edit-input-${todo.id}`}
              value=${state.todoCurrentlyEditing.value}
              onchange=${(event) => dispatch(actions.todos.editChange(event.target.value))}
              onblur="${() => dispatch(actions.todos.save())}"
              onkeydown="${(event) => (
                event.code === 'Enter'
                ? event.target.blur()
                : null
              )}"
            />
          </li>
        `)}
      </ul>
    </section>
    <footer class=${cx('footer', { hidden: state.todos.length <= 0 })}>
      <span class="todo-count"><strong>${state.todos.length}</strong> item${state.todos.length === 1 ? '' : 's'} left</span>
      <ul class="filters">
        <li><a class=${cx({ selected: state.currentList === 'all' })} href="#/">All</a></li>
        <li><a class=${cx({ selected: state.currentList === 'active' })} href="#/active">Active</a></li>
        <li><a class=${cx({ selected: state.currentList === 'completed' })} href="#/completed">Completed</a></li>
      </ul>
    </footer>
  </section>`;

  // update focus...
  if (state.todoCurrentlyEditing.id != null) {
    const editingInput = document.getElementById(`todo-edit-input-${state.todoCurrentlyEditing.id}`);
    if (document.activeElement !== editingInput) {
      editingInput.focus();
    }
  }
}

// Here, instead of mapping Stream AppState to Stream Nodes,
// we stop at Stream AppState and just treat renders as
// a purely side-effectual.  Dirty, but eh.
const render = tap(
  redraw(dispatch),
  appModel
);

runEffects(render, appScheduler);

window.$todo = {
  model: appModel,
  scheduler: appScheduler,
  most,
};
