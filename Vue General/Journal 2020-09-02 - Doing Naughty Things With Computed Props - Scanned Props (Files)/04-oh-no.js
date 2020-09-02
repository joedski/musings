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
    fooFooLower: scannedProp(
      function fooFooLower(acc = [null, null]) {
        return [this.foo.toLowerCase(), acc[0]];
      }
    ),
    fooFooUpper: scannedProp(
      function fooFooUpper(acc = [null, null]) {
        return [this.foo.toUpperCase(), acc[0]];
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
    fooFooLower: {
      immediate: true,
      handler(next) {
        this.onValueChange('fooFooLower', next);
      },
    },
    fooFooUpper: {
      immediate: true,
      handler(next) {
        this.onValueChange('fooFooUpper', next);
      },
    },
  },

  render(h) {
    return h('div', [
      h('div', JSON.stringify(this.fooFooLower[0])),
      h('div', JSON.stringify(this.fooFooLower[1])),
    ]);
  },
});

async function task() {
  function logFooProps(label) {
    console.log(`after ${label}:
  root.foo = ${JSON.stringify(root.foo)}
  root.fooFooLower = ${JSON.stringify(root.fooFooLower)}
  root.fooFooUpper = ${JSON.stringify(root.fooFooUpper)}`);
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
