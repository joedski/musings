const Vue = require('vue');

const INITIAL_VALUE = { value: 'Initial' };

const FooComp = Vue.extend({
  props: {
    onValueChange: { type: Function, default: () => () => {} },
  },

  data() {
    return {
      stateMap: {},
      fooLastChanged: INITIAL_VALUE,
    };
  },

  computed: {
    foo() {
      const { foo } = this.stateMap;
      if (foo == null) return INITIAL_VALUE;
      return foo;
    },
  },

  watch: {
    foo: {
      immediate: true,
      handler(next, prev) {
        this.onValueChange('foo', next);
        // NOTE: this can be generalized by using a changed-predicate.
        if (next !== prev) {
          this.fooLastChanged = next;
        }
      },
    },
    fooLastChanged: {
      immediate: true,
      handler(next) {
        this.onValueChange('fooLastChanged', next);
      }
    }
  },
});

async function task() {
  function logFooProps(label) {
    console.log(`after ${label}:
  root.foo = ${JSON.stringify(root.foo)}
  root.fooLastChanged = ${JSON.stringify(root.fooLastChanged)}`);
  }

  const fooChanges = [];

  const root = new FooComp({
    propsData: {
      onValueChange(name, value) {
        fooChanges.push({ name, value });
      },
    },
  });

  root.$mount();

  await Vue.nextTick();
  console.log('------------');
  logFooProps('mount');

  Vue.set(root.stateMap, 'bar', { value: 'Bar!' });

  await Vue.nextTick();
  console.log('------------');
  logFooProps(`Vue.set(root.stateMap, 'bar', { value: 'Bar!' })`);

  Vue.set(root.stateMap, 'foo', { value: 'second foo!' });

  await Vue.nextTick();
  console.log('------------');
  logFooProps(`Vue.set(root.stateMap, 'foo', { value: 'second foo!' })`);

  Vue.set(root.stateMap, 'bazinga', { value: 'Bazinga!' });

  await Vue.nextTick();
  console.log('------------');
  logFooProps(`Vue.set(root.stateMap, 'bazinga', { value: 'Bazinga!' })`);

  console.log('------------');

  console.log('all foo changes:', JSON.stringify(fooChanges, null, 2));
}

task()
.then(
  () => {
    process.exit(0);
  },
  error => {
    console.error(error);
    process.exit(1);
  }
);
