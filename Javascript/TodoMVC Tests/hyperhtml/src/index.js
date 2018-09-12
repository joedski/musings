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
        ${state.todos.map(todo => hyper.wire(todo, `:todo-${todo.id}`)`
          <li
            class=${cx({
              completed: todo.completed,
              editing: state.todoCurrentlyEditing.id === todo.id,
            })}
          >
            <div class="view">
              <input type="checkbox" class="toggle" checked=${todo.completed} />
              <label>${todo.value}</label>
              <input type="text" class="edit" value="${state.todoCurrentlyEditing.value}" />
            </div>
          </li>
        `)}
      </ul>
    </section>
  </section>`;
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
