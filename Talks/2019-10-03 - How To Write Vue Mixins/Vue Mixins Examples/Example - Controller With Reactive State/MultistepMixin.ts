import { Vue, Component, Prop, Provide } from 'vue-property-decorator';
import MultistepController from './MultistepController';

@Component({
  components: {
    MultistepIntroStep: () => import('./MultistepIntroStep.vue'),
    MultistepStep: () => import('./MultistepStep.vue'),
  },
})
export default class MultistepMixin extends Vue {
  @Prop({ type: Number })
  public multistepStartStep!: number;

  // Provide this for components...
  @Provide()
  protected get $multistep(): MultistepController {
    // `this` is not reactive, so this computed prop is only
    // computed once.
    return new MultistepController(this);
  }
}
