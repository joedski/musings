Journal 2020-04-06 - Functional Single File Components
========

The [documentation](https://vuejs.org/v2/guide/render-function.html#Functional-Components) at least as of 2020-04-06 regarding Functional Single File Components isn't all that detailed, it just says "You can do `<template functional>...</template>`", but doesn't actually say how you use the props.  Do you have to reference `context` for everything?  Can you just say `props.foo`?  I don't know!

[This blog post from LogRocket](https://blog.logrocket.com/how-to-use-stateless-components-in-vue-js/) indicates that you use `props.foo`, so I guess that makes `context` the, um, context.  Okay.  They also have the `functional` indication on both the template and script, so eh.

Their example component:

```html
<template functional>
  <div>
    <p v-for="brand in props.brands" :key="brand">{{brand}}</p>
  </div>
</template>
<script>
export default {
  functional: true,
  name: 'Test',
  props: {
    brands: Array
  }
}
</script>
```

The Vue version we were running, apparently Vue 2.6, didn't seem to work with that though.  Or at least, whatever ended up being used to compile the template into a render function didn't produce the right code, or it wasn't called right, or ... something.  I dunno.

I got something like this:

```js
module.exports={render:function (){
var _obj;
var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;
  return _c('div', {
    class: ( _obj = {
      'welcome-overlay-number-circle': true
    }, _obj[("welcome-overlay-number-circle--" + (_vm.props.number))] = _vm.props.number != null, _obj )
  }, [_vm._v("\n  " + _vm._s(_vm.props.number) + "\n")])
},staticRenderFns: []}
module.exports.render._withStripped = true
if (false) {
  module.hot.accept()
  if (module.hot.data) {
     require("vue-hot-reload-api").rerender("data-v-9e81bf80", module.exports)
  }
}
```

Which then produced an error on the `var _c=_vm._self._c||_h` part with `TypeError: Cannot read property '_c' of undefined`.  When I breakpointed in there, `this` was `window`, which wouldn't have any of that stuff.

I don't know what's going on there and I've stopped caring at the moment.  I'll come back to that later, I guess.

The only thing I can think of is that our `vue-loader` is at `11.3.4`.  [This issue comment](https://github.com/vuejs/vue/issues/3977#issuecomment-335881476) seems to indicate proper support for `<template functional>` landed in 13.3, so that means this is a no go on our current project.  I don't want to bother determining an upgrade yet.
