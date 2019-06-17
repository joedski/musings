Journal 2019-06-17 - Vuex Getters Returning Functions
=======

- Suppose a Vuex Getter returns a Function.
    - This Function will find a datum within a collection within the Actual State.
    - As expected, at minimum, this Function must close over a reference to Actual State, not Derived State.
- Suppose this Function is used in a Component's Computed Prop.
- Will the Computed Prop reactively update...
    - If the container of the target data is modified?
    - If the target data itself is modified?

A boilerplate to start with: https://jsfiddle.net/n9jmu5v7/1269/

Result:

- It seems that indeed, if the Computed Prop itself touches Actual State via the Returned Function from the Getter, then subcriptions are properly created.
    - That would make sense as a natural extension of subscriptions properly registering when using direct state access via `this.$store.state...`.

Things Not Covered:

- General Global Caching: Currently caching only occurs at the component level.
    - I personally think this is a good thing.  Generalized caching schemes are complicated, and require extra tooling such as `re-reselect`.
    - It's also usually less data intensive: unnecessary derived data doesn't stick around past the life time of the component using it.



## Appendix: Code Example

[Code on JSFiddle](https://jsfiddle.net/kozx3t90/)

```js
const store = new Vuex.Store({
  state: {
    todos: [
      { text: "Learn JavaScript", done: false },
      { text: "Learn Vue", done: false },
      { text: "Play around in JSFiddle", done: true },
      { text: "Build something awesome", done: true },
    ],
  },
  getters: {
    todosIncludingText(state) {
      const todos = state.todos;
      return function getTodosIncludingText(text) {
        return todos.filter(todo => todo.text.includes(text));
      };
    },
  },
  mutations: {
    toggleTodoDone(state, index) {
      state.todos[index].done = ! state.todos[index].done;
    },
  },
});

new Vue({
  el: "#app",
  computed: {
    todos() {
      return store.state.todos;
    },
    todosIncludingLearn() {
      return store.getters.todosIncludingText('Learn');
    },
  },
  methods: {
    toggle: function(index){
      store.commit('toggleTodoDone', index);
    },
  },
});
```

```html
<div id="app">
  <h2>Todos:</h2>
  <ol>
    <li v-for="(todo, index) in todos">
      <label>
        <input type="checkbox"
          v-on:change="toggle(index)"
          v-bind:checked="todo.done">

        <del v-if="todo.done">
          {{ todo.text }}
        </del>
        <span v-else>
          {{ todo.text }}
        </span>
      </label>
    </li>
  </ol>
  <hr>
  <h2>Todos about Learning:</h2>
  <ol>
    <li v-for="todo in todosIncludingLearn">
      <input type="checkbox" v-bind:checked="todo.done" disabled>

      <del v-if="todo.done">
        {{ todo.text }}
      </del>
      <span v-else>
        {{ todo.text }}
      </span>
    </li>
  </ol>
</div>
```

```css
body {
  background: #20262E;
  padding: 20px;
  font-family: Helvetica;
}

#app {
  background: #fff;
  border-radius: 4px;
  padding: 20px;
  transition: all 0.2s;
}

li {
  margin: 8px 0;
}

h2 {
  font-weight: bold;
  margin-bottom: 15px;
}

del {
  color: rgba(0, 0, 0, 0.3);
}
```
