const get = require('lodash/get');
const Vue = require('vue');

const scannedPropCache = new WeakMap();

function getSource(vm, source) {
  if (typeof source === 'string') {
    return get(vm, source);
  }

  if (typeof source === 'function') {
    // support both `this.foo` and `vm => vm.foo` forms.
    return source.call(vm, vm);
  }

  throw new Error(`Cannot get value from VM using unknown source: ${source}`);
}

function scannedProp(source, iteratee, init) {
  return function computeScannedProp() {
    const next = getSource(this, source);
    const hasLastState = scannedPropCache.has(this);
    const lastState = hasLastState
      ? scannedPropCache.get(this)
      : init();
    const nextState = iteratee(lastState, next);

    scannedPropCache.set(this, nextState);
    return nextState;
  }
}

const FooComp = Vue.extend({
  props: {
    onValueChange: { type: Function, default: () => () => {} },
  },

  data() {
    return {
      // nulls are naughty too, but whatever.
      foo: 'First',
    };
  },

  computed: {
    fooFoo: scannedProp(
      vm => vm.foo,
      (acc, next) => [next, acc[0]],
      () => [null, null]
    ),
  },

  watch: {
    foo: {
      immediate: true,
      handler(next) {
        this.onValueChange('foo', next);
      },
    },
    fooFoo: {
      immediate: true,
      handler(next) {
        this.onValueChange('fooFoo', next);
      },
    },
  },

  render(h) {
    return h('div', [
      h('div', JSON.stringify(this.fooFoo[0])),
      h('div', JSON.stringify(this.fooFoo[1])),
    ]);
  },
});

async function task() {
  function logFooProps(label) {
    console.log(`after ${label}:
  root.foo = ${JSON.stringify(root.foo)}
  root.fooFoo = ${JSON.stringify(root.fooFoo)}`);
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

  root.foo = 'Second';

  await Vue.nextTick();
  console.log('------------');
  logFooProps('foo=Second');

  root.foo = 'Third';

  await Vue.nextTick();
  console.log('------------');
  logFooProps('foo=Third');

  console.log('------------');

  console.log('all fooChanges:', JSON.stringify(fooChanges, null, 2));
}

task()
.then(() => {
  console.log(`
==================
    SECOND RUN
==================
`);
})
.then(() => task())
.then(
  () => {
    process.exit(0);
  },
  error => {
    console.error(error);
    process.exit(1);
  }
);
