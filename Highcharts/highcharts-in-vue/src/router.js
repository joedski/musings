import Router from 'vue-router'
import BasicChart from '@/views/BasicChart'

export default new Router({
  routes: [
    {
      path: '/',
      redirect: '/basic-chart',
    },
    {
      path: '/basic-chart',
      name: 'Basic Chart',
      component: BasicChart,
    },
  ],
})
