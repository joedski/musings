<template>
  <div id="app">
    <b-navbar>
      <b-nav pills>
        <b-nav-item to="/basic-chart">Basic Chart</b-nav-item>
      </b-nav>
    </b-navbar>
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'app',
  data () {
    return {
      msg: 'Welcome to Your Vue.js App'
    }
  }
}
</script>

<style lang="scss">
</style>
