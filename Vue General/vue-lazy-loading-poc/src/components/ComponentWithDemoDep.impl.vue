<template lang="html">
  <div class="component-with-demo-dep">
    <h2>Component with DemoDep: {{target}}...</h2>
    <demo-dep-component :target="target" />
  </div>
</template>

<script>
export default {
  props: {
    target: {
      type: String,
      default() {
        return 'World';
      },
    },
  },
};
</script>

<style lang="css">
</style>
