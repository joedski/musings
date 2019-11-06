import Vue from 'vue';

interface TimeseriesControllerState {
  timeseriesData: TimeseriesData;
  slice: Slice;
}

type TimeseriesData = Readonly<Array<{ x: number; y: number }>>;

interface Slice {
  start: number;
  end: number;
};

/**
 * Hides a value from reactivity. (Probably not needed in Vue 3?)
 * Useful for gigantic data.
 * @param v Any non-primitive value
 */
function atom<T extends object>(v: T): Readonly<T> {
  return Object.create(v);
}

export default Vue.extend({
  props: {
    vm: {
      type: Object,
      required: true,
    },
  },

  data(): TimeseriesControllerState {
    return {
      timeseriesData: atom([]),
      slice: {
        start: 0,
        end: Infinity,
      },
    };
  },

  computed: {
    timeseriesDataSlice(): TimeseriesData {
      return this.timeseriesData.filter(
        datum =>
          datum.x >= this.slice.start &&
          datum.x <= this.slice.end
      );
    },
  },

  methods: {
    setSlice(start: number, end: number) :void {
      this.slice.start = start;
      this.slice.end = end;
    },

    fetchData() {
      // ... maybe driven by props, or just parameters.
    },
  },
});
