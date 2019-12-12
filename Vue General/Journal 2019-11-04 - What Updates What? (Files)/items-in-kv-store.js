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
      kv: {},
    };
  },

  computed: {
    getValueWithPick() {
      const { kv } = this;
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
        const stateAtKey = this.kv[key];
        if (stateAtKey == null) {
          return null;
        }
        return stateAtKey.value;
      }).bind(this);
    },
  },

  methods: {
    setKv(key, value) {
      if (this.kv[key] == null) {
        this.$set(this.kv, key, newValueState(value));
      } else {
        this.kv[key].value = value;
      }
    },

    deleteKey(key) {
      if (this.kv[key] != null) {
        this.$delete(this.kv, key);
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
})
.then(() => {
  process.exit(0);
})
.catch(error => {
  console.error(error);
  process.exit(1);
});
