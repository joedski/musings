Journal 2020-02-21 - Vue Observables and Computed Props
========

One thing that kinda bothered me was that, when breaking things into sub-controllers before the Composition API was a thing, you could see the data directly attached to an Observable that was used as that controller's state, but you couldn't see getters on the controller.

I wondered then if you just place a getter on the Observable itself, if that would effectively create a Vue Computed Prop?

It seems the answer is "yes", at least in Vue 2.6.10, and probably other versions too.  Fascinating.

```js
const Vue = require('vue');

class Foo {
  constructor() {
    this.state = Vue.observable({
      id: 1,
      get name() {
        return `[Foo #${this.id}]`;
      },
    });
  }
}

const Comp = Vue.extend({
  props: {
    watchHandler: { type: Function, required: true },
  },

  data() {
    return {
      foo: new Foo(),
    };
  },

  watch: {
    'foo.state.name'(next, prev) {
      this.watchHandler(next, prev);
    },
  },
});

async function task() {
  const comp = new Comp({
    propsData: {
      watchHandler(next, prev) {
        console.log('changed from', prev, 'to', next);
      },
    },
  });

  comp.foo.state.id = 2;
  await Vue.nextTick();
  // should log "changed from [Foo #1] to [Foo #2]"

  comp.foo.state.id = 42;
  await Vue.nextTick();
  // should log "changed from [Foo #2] to [Foo #42]"

  comp.foo.state.name = 'something else!';
  await Vue.nextTick();
  console.log('what is foo.state.name after setting it to something else?', comp.foo.state.name);
  // should log "what is foo.name? [Foo #42]"

  comp.foo.state.id = 255;
  await Vue.nextTick();
  // should log "changed from [Foo #42] to [Foo #255]"
}

task()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
```

That is very useful.
