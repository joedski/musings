<template>
  <div id="app">
    <img src="./assets/logo.png">
    <div class="demo-nav">
      <a
        @click="$root.currentPage = 'HelloWorld'"
        :class="{ current: $root.currentPage === 'HelloWorld' }"
      >World</a>
      <a
        @click="$root.currentPage = 'HelloDemo'"
        :class="{ current: $root.currentPage === 'HelloDemo' }"
      >Demo</a>
      <a
        @click="$root.currentPage = 'HelloBeans'"
        :class="{ current: $root.currentPage === 'HelloBeans' }"
      >Beans</a>
    </div>
    <template v-if="$root.currentPage === 'HelloWorld'">
      <hello-world />
    </template>
    <template v-if="$root.currentPage === 'HelloDemo'">
      <component-with-demo-dep />
    </template>
    <template v-if="$root.currentPage === 'HelloBeans'">
      <component-with-demo-dep target="Beans" />
    </template>
  </div>
</template>

<script>
import HelloWorld from './components/HelloWorld';
import ComponentWithDemoDep from './components/ComponentWithDemoDep';

export default {
  name: 'App',
  components: {
    HelloWorld,
    ComponentWithDemoDep,
  },
};
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

.demo-nav {
  display: flex;
  flex-direction: row;
  justify-content: center;
}

.demo-nav a {
  font-weight: normal;
  padding: 0.25em 0.5em;
}

.demo-nav a.current {
  font-weight: bold;
}
</style>
