import { Vue, Component } from 'vue-property-decorator';

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

@Component({})
export default class TimeseriesController extends Vue {
  // Technically reactive state, but not really.
  protected vm!: Vue;

  // Reactive State
  protected timeseriesData: TimeseriesData = atom([]);
  protected slice: Slice = { start: 0, end: Infinity };

  // Potentially large data, converted to a Vue Computed Prop
  // by vue-property-decorator/vue-class-component.
  public get timeseriesDataSlice(): TimeseriesData {
    return this.timeseriesData.filter(
      datum =>
        datum.x >= this.slice.start &&
        datum.x <= this.slice.end
    );
  }

  public init(vm: Vue): void {
    this.vm = atom(vm);
  }

  public setSlice(start: number, end: number) :void {
    this.slice.start = start;
    this.slice.end = end;
  }

  public fetchData() {
    // ... maybe driven by props, or just parameters.
  }
}
