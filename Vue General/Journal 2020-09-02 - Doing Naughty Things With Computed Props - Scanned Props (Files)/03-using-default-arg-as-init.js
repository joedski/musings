const Vue = require('vue');

const scannedPropCache = new WeakMap();

function scannedProp(iteratee) {
  return function computeScannedProp() {
    // Will be undefined on first run.
    const lastState = scannedPropCache.get(this);
    // We also pass the VM as the last argument
    // if arrow functions are more your fancy.
    const nextState = iteratee.call(this, lastState, this);

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
      function fooFoo(acc = [null, null]) {
        return [this.foo, acc[0]];
      }
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
