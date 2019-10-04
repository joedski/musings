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
  protected $multistep!: MultistepController;

  beforeCreate() {
    this.$multistep = new MultistepController(this);
  }
}
