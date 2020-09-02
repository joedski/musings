const Vue = require('vue');

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
    fooFoo: (() => {
      function iteratee(acc, next) {
        return [next, acc[0]];
      }

      let lastAcc = [null, null];

      return function fooFoo() {
        const nextAcc = iteratee(lastAcc, this.foo);
        lastAcc = nextAcc;
        return nextAcc;
      };
    })(),
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

task().then(
  () => {
    process.exit(0);
  },
  error => {
    console.error(error);
    process.exit(1);
  }
);
