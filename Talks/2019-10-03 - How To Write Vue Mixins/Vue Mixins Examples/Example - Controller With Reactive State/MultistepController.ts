import { Vue } from 'vue-property-decorator';
import MultistepMixin from './MultistepMixin';

export default class MultistepController {
  constructor(
    protected vm: MultistepMixin
  ) {}

  public get startStep(): number {
    if (Number.isFinite(this.vm.multistepStartStep)) {
      return this.vm.multistepStartStep;
    }

    return 1;
  }

  public nextStep(): void {
    this.state.step += 1;
  }

  protected state = Vue.observable({
    step: this.startStep,
  });
}
