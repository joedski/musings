const Vue = require('vue');
const WeakMap2D = require('./utils').WeakMap2D;

const scannedPropCache = new WeakMap2D();

function scannedProp(iteratee) {
  return function computeScannedProp() {
    // Will be undefined on first run.
    const lastState = scannedPropCache.get(iteratee, this);
    // We also pass the VM as the last argument
    // if arrow functions are more your fancy.
    const nextState = iteratee.call(this, lastState, this);

    scannedPropCache.set(iteratee, this, nextState);
    return nextState;
  }
}

const INITIAL_STATE = { value: { name: 'Nothing!' } };

const FooComp = Vue.extend({
  props: {
    onValueChange: { type: Function, default: () => () => {} },
  },

  data() {
    return {
      stateMap: {},
    };
  },

  computed: {
    fooStateValue() {
      const { foo } = this.stateMap;
      // INITIAL_STATE is a constant, so it should
      // always equal itself by identity.
      if (foo == null) return INITIAL_STATE.value;
      return foo.value;
    },
    lastFiveFoos: scannedProp(
      function lastFiveFoos(acc = []) {
        const next = [this.fooStateValue, ...acc];
        return next.slice(0, 5);
      }
    ),
  },

  watch: {
    fooStateValue: {
      immediate: true,
      handler(next) {
        this.onValueChange('fooStateValue', next);
      },
    },
    lastFiveFoos: {
      immediate: true,
      handler(next) {
        this.onValueChange('lastFiveFoos', next);
      }
    },
  },

  render(h) {
    return h('div', [
      h('div', JSON.stringify(this.fooStateValue[0])),
      h('div', JSON.stringify(this.lastFiveFoos[0])),
    ]);
  },
});

async function task() {
  function logFooProps(label) {
    console.log(`after ${label}:
  root.fooStateValue = ${JSON.stringify(root.fooStateValue)}
  root.lastFiveFoos = ${JSON.stringify(root.lastFiveFoos)}`);
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

  // root.foo = 'Second';
  Vue.set(root.stateMap, 'bar', { name: 'Bar!' });

  await Vue.nextTick();
  console.log('------------');
  logFooProps('set(stateMap, bar, Bar!)');

  // root.foo = 'Third';
  Vue.set(root.stateMap, 'baz', { name: 'Baz?' });

  await Vue.nextTick();
  console.log('------------');
  logFooProps('set(stateMap, baz, Baz?)');

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
