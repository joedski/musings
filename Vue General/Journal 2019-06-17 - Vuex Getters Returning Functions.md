Journal 2019-06-17 - Vuex Getters Returning Functions
=======

> Update 2019-12-02: It's really pretty simple, and the initial example is not really all that great.

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



## A Later Look

After some consideration and experimentation, I've come to the following conclusion:

- If you need to cache over some derived data, you should prefer to return that derived data collection directly.
- Where access into that is made less complicated by a custom interface, you can return a function over that derived data, bearing in mind the function itself will also be created anew each time the base data is updated. (as expected, because it's itself derived data)
- If you just need to access state directly according to parameters, directly return only a function that does the desired parametric state access.
- If you just need to access the state directly because you're using `typesafe-vuex` or some other similar thing...
    - Give `this.$store` a proper type
    - Create a getter that just returns a function that itself accepts an accessor, `getState(state) { return fn => fn(state); }`, and use that one rather than defining a new getter for each separate datum in the state.

Why?

- When a wholly new derived datum is returned from a computed prop/getter, it is not deeply reactive.  Rather, access of that computed prop/getter itself is what registers subscriptions.
- When a function is returned from a computed prop/getter, a few things happen:
    - Once the computed prop/getter computor returns, Vue stops checking for subscription registrations for that computor.
    - However, if the returned function is called within another computed prop (at a component, perhaps) then Vue is still checking for subscription registrations, but for that still-executing computor rather than the computor that returned the function.
        - Therefore, access to any reactive data (store state in this case) during that time will register appropriate subscriptions.
- By not registering any subscriptions for the returned function itself, it is cached once over the lifetime of the component or store, and actual subscription registrations are deferred until the actual points of use.
    - By this, it can be seen that outside of bad practice or bad API workarounds, parametrized getters by and large do not need to be defined in the store and should instead be defined as free functions.
- If you're accessing stuff in a non-computed/non-getter context, you're not creating subscriptions anyway, and so it doesn't matter.


### Effects On The Previous Example

The code will be better like this:

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
      return function getTodosIncludingText(text) {
        return state.todos.filter(todo => todo.text.includes(text));
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

