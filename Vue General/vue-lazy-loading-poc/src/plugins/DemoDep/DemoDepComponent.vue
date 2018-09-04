<template lang="html">
  <div class="demo-dep-component">
    Hello, {{target}}!
  </div>
</template>

<script>
export default {
  name: 'DemoDepComponent',

  props: {
    target: {
      type: String,
      required: true,
    },
  },
};
</script>

<style lang="css">
</style>
