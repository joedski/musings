import 'todomvc-app-css/index.css';
import hyper from 'hyperhtml';
import { skipRepeats, scan, tap, runEffects, MulticastSource, never } from '@most/core';
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
    },
    todos: [],
    currentList: 'all',
  },
  appActions
));

// Model: Actions
// Going of the most+react example, these look rather like how
// hyperapp itself works...

const actions = {
  newTodo: {
    change: value => state => ({ ...state, newTodo: { ...state.newTodo, value }}),
  },
}



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
      <input
        value=${state.newTodo.value}
        onchange=${event => dispatch(actions.newTodo.change(event.target.value))}
        type="text"
        class="new-todo"
        placeholder="What needs to be done?"
      />
    </header>
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
