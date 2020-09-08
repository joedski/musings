const Vue = require('vue');
const WeakMap2D = require('./utils').WeakMap2D;

const keepDistinctByCache = new WeakMap2D();

function keepDistinctBy(
  getValue,
  isDistinct
) {
  return function keepDistinctByProp() {
    const state = keepDistinctByCache.get(this, keepDistinctByProp);

    if (state == null) {
      const initialValue = getValue.call(this);
      const initialState = Vue.observable({
        // Value is wrapped in a function to prevent unexpected reactification.
        value: () => initialValue,
      });

      keepDistinctByCache.set(this, keepDistinctByProp, initialState);

      this.$watch(getValue, (next, prev) => {
        if (isDistinct(next, prev)) {
          const state = keepDistinctByCache.get(this, keepDistinctByProp);
          state.value = () => next;
        }
      });

      return initialState.value();
    }

    return state.value();
  };
}

const INITIAL_VALUE = { value: 'Initial' };

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
    foo() {
      const { foo } = this.stateMap;
      if (foo == null) return INITIAL_VALUE;
      return foo;
    },
    fooDistinct: keepDistinctBy(
      function () { return this.foo; },
      (next, prev) => next !== prev
    ),
    derivedFromfoo() {
      return { stringified: JSON.stringify(this.fooDistinct) };
    }
  },

  watch: {
    foo: {
      immediate: true,
      handler(next, prev) {
        this.onValueChange('foo', next);
      },
    },
    fooDistinct: {
      immediate: true,
      handler(next) {
        this.onValueChange('fooDistinct', next);
      }
    },
    derivedFromfoo: {
      immediate: true,
      handler(next) {
        this.onValueChange('derivedFromfoo', next);
      }
    },
  },
});

async function task() {
  function logFooProps(label) {
    console.log(`after ${label}:
  root.foo = ${JSON.stringify(root.foo)}
  root.fooDistinct = ${JSON.stringify(root.fooDistinct)}
  root.derivedFromfoo = ${JSON.stringify(root.derivedFromfoo)}`);
  }

  const fooChanges = [];
  async function doChange(change) {
    fooChanges.push(change.toString());

    change();

    await Vue.nextTick();

    console.log('------------');
    logFooProps(change.toString());
  }

  let root = null;

  function initAndMount() {
    root = new FooComp({
      propsData: {
        onValueChange(name, value) {
          fooChanges.push({ name, value });
        },
      },
    });

    root.$mount();
  }

  await doChange(() => initAndMount());

  await doChange(() => Vue.set(root.stateMap, 'bar', { value: 'Bar!' }));

  await doChange(() => Vue.set(root.stateMap, 'zap', { value: 'Zap Zap Zap!' }));

  await doChange(() => Vue.set(root.stateMap, 'foo', { value: 'second foo!' }));

  await doChange(() => Vue.set(root.stateMap, 'bazinga', { value: 'Bazinga!' }));

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
