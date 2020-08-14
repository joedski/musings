Journal 2020-07-28 - Lifecycle Hooks in Delegate Controllers Without Composition API
========

The big thing to me about the Composition API is that you can create reusable logic that still makes use of the component lifecycle hooks without having to pass an actual component instance aronud, or anything like that.  It's just automatic!

But at the moment, it's not released (though it's in 1.x beta 6 as of writing!)



## The First Hurtle: Clean Up

The first hurtle is that unless a component is handled by Vue's rendering machinery, it doesn't automatically get cleaned up.  That is, you can't just create `new Child({ parent: this })` and have things work when when `this.$destroy()` eventually gets called, which is kinda sad, but makes sense given components were geared towards rendering and not other tasks.

Until now, I've mostly gotten around this by just writing things in a manner that doesn't require explicit clean up.  For the most part, the only thing that required clean up was the watches, so I just used the parent component as `$context` of the delegate controller and used `$delegate.$watch()` to setup any of those.  It would be kind of nice to not need to do that, though.



## Appendix


### Testing The `parent` Option

```js
const Vue = require('vue')

const Comp = Vue.extend({
  props: {
    name: { type: String },
    callback: { type: Function }
  },
  created () {
    this.callback('Parent created!')
  },
  beforeDestroy () {
    this.callback('Parent beforeDestroy!')
  }
})

;(async function task () {
  const messages = []
  const callback = messages.push.bind(messages)

  try {
    const parent = new Comp({
      propsData: { name: 'Parent', callback }
    })
    const child = new Comp({
      parent,
      propsData: { name: 'Child', callback }
    })

    await Vue.nextTick()

    parent.$destroy()

    await Vue.nextTick()

    return messages
  } catch (error) {
    error.loggedMessages = messages
    throw error
  }
})().then(
  messages => {
    console.log('Done!  Messages were:')
    for (const message of messages) {
      console.log(message)
    }
  },
  error => {
    console.error(error)
    if (Array.isArray(error.loggedMessages)) {
      console.log('Messages were:')
      for (const message of error.loggedMessages) {
        console.log(message)
      }
    } else {
      console.log('No messages!')
    }
  }
)
```
