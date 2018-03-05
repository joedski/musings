import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap-vue/dist/bootstrap-vue.css"
import 'vue-resize/dist/vue-resize.css'

import Vue from 'vue'
import VueRouter from 'vue-router'
import BootstrapVue from "bootstrap-vue"
import Highcharts from 'highcharts'
import VueHighcharts from 'vue-highcharts'
import VueResize from 'vue-resize'

import App from './App.vue'
import router from './router'

Vue.use(VueRouter)
Vue.use(VueResize)
Vue.use(BootstrapVue)
Vue.use(VueHighcharts, { Highcharts })

new Vue({
  el: '#app',
  render: h => h(App)
})
