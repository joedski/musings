import 'todomvc-app-css/index.css';
import hyper from 'hyperhtml';
import { now, constant, tap, runEffects } from '@most/core';
import { newDefaultScheduler } from '@most/scheduler';

const appEl = document.getElementById('app');

/**
 * This function actually flushes changes to the DOM,
 * by calling `hyperHTML.bind` on the root element.
 *
 * hyperHTML itself keeps things performant by caching under the hood
 * based on both the template string-parts inputs and
 * the actual argument/interpolation inputs.
 */
function redraw(state) {
  hyper.bind(appEl)`<section class="todoapp">
    <header class="header">
      <h1>todos</h1>
      <input type="text" class="new-todo" placeholder="What needs to be done?" />
    </header>
  </section>`;
}

const render = tap(
  redraw,
  constant({}, now()),
);

runEffects(render, newDefaultScheduler());
