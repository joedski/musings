import { Vue } from 'vue-property-decorator';
import MultistepMixin from './MultistepMixin';

interface MultistepControllerState {
  step: number;
}

export default class MultistepController {
  protected state: MultistepControllerState;

  constructor(
    protected vm: MultistepMixin
  ) {
    this.state = Vue.observable({
      step: this.startStep,
    });
  }

  public get startStep(): number {
    if (Number.isFinite(this.vm.multistepStartStep)) {
      return this.vm.multistepStartStep;
    }

    return 1;
  }

  public nextStep(): void {
    this.state.step += 1;
  }
}
