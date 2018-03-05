<template>
  <div id="app">
    <b-nav-bar>
      <b-nav>
        <b-nav-item>
          <router-link to="/basic-chart">Basic Chart</router-link>
        </b-nav-item>
      </b-nav>
    </b-nav-bar>
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
