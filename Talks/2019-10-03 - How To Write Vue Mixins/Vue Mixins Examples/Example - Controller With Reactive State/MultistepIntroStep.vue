<template>
  <div>Intro step!</div>
</template>

<script lang="ts">
import { Vue, Component, Inject } from 'vue-property-decorator';
import MultistepController from './MultistepController';

@Component({})
export default class MultistepIntroStep extends Vue {
  @Inject()
  protected $multistep!: MultistepController;

  protected handleClickNext(): void {
    this.$multistep.nextStep();
  }
}
</script>
