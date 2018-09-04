export default () => ({
  component: import(
    /* webpackChunkName: "demo-dep" */
    '@/Dependencies/InstallDemoDep',
  ).then(() => import(
    /* webpackChunkName: "demo-dep" */
    './ComponentWithDemoDep.impl',
  )),

  // Optional: `loading` and `error` components.
});
