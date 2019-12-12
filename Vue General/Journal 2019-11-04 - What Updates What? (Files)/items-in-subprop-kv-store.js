const Vue = require('vue');

function newValueState(value) {
  return { value };
}

function logSection(sectionTitle) {
  console.log(`
${sectionTitle}
${'='.repeat(sectionTitle.length)}
`);
}

async function section(sectionTitle, fn) {
  logSection(sectionTitle);
  await fn();
  await Vue.nextTick();
}

const component = new Vue({
  data() {
    return {
      state: {
        kv: {},
      },
    };
  },

  computed: {
    getValueWithPick() {
      const { state: { kv } } = this;
      return function getValue(key) {
        const stateAtKey = kv[key];
        if (stateAtKey == null) {
          return null;
        }
        return stateAtKey.value;
      };
    },

    getValueWithoutPick() {
      return (function getValue(key) {
        const stateAtKey = this.state.kv[key];
        if (stateAtKey == null) {
          return null;
        }
        return stateAtKey.value;
      }).bind(this);
    },

    aWithPick() {
      return this.getValueWithPick('a');
    },

    bWithPick() {
      return this.getValueWithPick('b');
    },

    aWithoutPick() {
      return this.getValueWithoutPick('a');
    },

    bWithoutPick() {
      return this.getValueWithoutPick('b');
    },
  },

  methods: {
    setKv(key, value) {
      if (this.state.kv[key] == null) {
        this.$set(this.state.kv, key, newValueState(value));
      } else {
        this.state.kv[key].value = value;
      }
    },

    deleteKey(key) {
      if (this.state.kv[key] != null) {
        this.$delete(this.state.kv, key);
      }
    },
  },

  created() {
    this.$watch(
      () => this.getValueWithPick('a'),
      (next, prev) => {
        console.log('getValueWithPick(a)', next, prev);
      }
    );

    this.$watch(
      () => this.getValueWithPick('b'),
      (next, prev) => {
        console.log('getValueWithPick(b)', next, prev);
      }
    );

    this.$watch(
      () => this.getValueWithoutPick('a'),
      (next, prev) => {
        console.log('getValueWithoutPick(a)', next, prev);
      }
    );

    this.$watch(
      () => this.getValueWithoutPick('b'),
      (next, prev) => {
        console.log('getValueWithoutPick(b)', next, prev);
      }
    );

    this.$watch(
      'aWithPick',
      (next, prev) => {
        console.log('this.aWithPick', next, prev);
      }
    );

    this.$watch(
      'bWithPick',
      (next, prev) => {
        console.log('this.bWithPick', next, prev);
      }
    );

    this.$watch(
      'aWithoutPick',
      (next, prev) => {
        console.log('this.aWithoutPick', next, prev);
      }
    );

    this.$watch(
      'bWithoutPick',
      (next, prev) => {
        console.log('this.bWithoutPick', next, prev);
      }
    );
  },
});

Promise.resolve()
.then(async () => {
  await section('setKv(a, first)', () => {
    component.setKv('a', 'first');
  });

  await section('setKv(a, second)', () => {
    component.setKv('a', 'second');
  });

  await section('setKv(b, first)', () => {
    component.setKv('b', 'first');
  });

  await section('setKv(a, third)', () => {
    component.setKv('a', 'third');
  });

  await section('deleteKey(a)', () => {
    component.deleteKey('a');
  });
})
.then(() => {
  process.exit(0);
})
.catch(error => {
  console.error(error);
  process.exit(1);
});
