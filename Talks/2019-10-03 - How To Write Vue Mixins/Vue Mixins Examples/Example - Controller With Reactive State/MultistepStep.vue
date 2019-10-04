<template>
  <div>Regular step!</div>
</template>

<script lang="ts">
import { Vue, Component, Inject } from 'vue-property-decorator';
import MultistepController from './MultistepController';

@Component({})
export default class MultistepStep extends Vue {
  @Inject('$multistep')
  protected $multistep!: MultistepController;

  protected handleClickNext(): void {
    this.$multistep.nextStep();
  }
}
</script>
