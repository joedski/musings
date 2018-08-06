Vue Style Guides
================

As of writing (2018-06-23) there are two main styleguide type things for Vue projects:
1. [vue-styleguidist](https://github.com/vue-styleguidist/vue-styleguidist)
2. [Storybook](https://github.com/storybooks/storybook), which has Vue support

On one project, I got `vue-styleguidist` setup, but I don't recall it being a straight forward affair.  I think their docs were not so intuitive, and there were some things still left over from the React project.  The main issue is that I don't think I actually journalled the issues I ran into anywhere, which is problematic for repeating the process.



## Vue Styleguidist

One of the major issue I ran into with Vue Styleguidist is that it uses [Bublé](https://github.com/Rich-Harris/buble), which while much faster than Babel, does not support ES6 module syntax.  That's a bit of a problem given that everything we're using uses that module syntax.  That could also be why I kept running into some sort of "not found" errors?  Dunno.  I'll see how Storybook is instead, I guess.



## Storybook with Vue Support

One reason I opted to try Vue Styleguidist before was that its setup of component examples was much less manual, making use of globs and checking for `*.md` files that correspond to any found `*.vue` to identify examples.  Storybook on the other hand requires manual setup, though I suppose there's no reason why you couldn't autogen this or even do it manually?  Hm.

Anyway, guess I'll try that out, starting with [Getting Started](https://github.com/storybooks/storybook#getting-started).  Usually a good place to start.

> Aside: Storybook even has a [Mithril 1.x](https://mithril.js.org/) module pre-made.  Nice.  It's still in alpha as of 2018-06-23, but hey.

So, it seems to work pretty well?  Except that I ran into an error right off the bat:

```
Module build failed: TypeError: /Users/joedski/SpiderOak Hive/Work/VPS/Repos/virtual-server-site/src/stories/index.stories.js: Duplicate declaration "h" (This is an error on an internal node. Probably an internal error)
    at File.buildCodeFrameError (/Users/joedski/SpiderOak Hive/Work/VPS/Repos/virtual-server-site/node_modules/babel-core/lib/transformation/file/index.js:427:15)
    at Scope.checkBlockScopedCollisions (/Users/joedski/SpiderOak Hive/Work/VPS/Repos/virtual-server-site/node_modules/babel-traverse/lib/scope/index.js:398:27)
    at Scope.registerBinding (/Users/joedski/SpiderOak Hive/Work/VPS/Repos/virtual-server-site/node_modules/babel-traverse/lib/scope/index.js:592:16)
    at Scope.registerDeclaration (/Users/joedski/SpiderOak Hive/Work/VPS/Repos/virtual-server-site/node_modules/babel-traverse/lib/scope/index.js:496:14)
    at Object.BlockScoped (/Users/joedski/SpiderOak Hive/Work/VPS/Repos/virtual-server-site/node_modules/babel-traverse/lib/scope/index.js:244:28)
    at Object.newFn (/Users/joedski/SpiderOak Hive/Work/VPS/Repos/virtual-server-site/node_modules/babel-traverse/lib/visitors.js:318:17)
    at NodePath._call (/Users/joedski/SpiderOak Hive/Work/VPS/Repos/virtual-server-site/node_modules/babel-traverse/lib/path/context.js:76:18)
    at NodePath.call (/Users/joedski/SpiderOak Hive/Work/VPS/Repos/virtual-server-site/node_modules/babel-traverse/lib/path/context.js:44:14)
    at NodePath.visit (/Users/joedski/SpiderOak Hive/Work/VPS/Repos/virtual-server-site/node_modules/babel-traverse/lib/path/context.js:105:12)
    at TraversalContext.visitQueue (/Users/joedski/SpiderOak Hive/Work/VPS/Repos/virtual-server-site/node_modules/babel-traverse/lib/context.js:150:16)
    at TraversalContext.visitMultiple (/Users/joedski/SpiderOak Hive/Work/VPS/Repos/virtual-server-site/node_modules/babel-traverse/lib/context.js:103:17)
    at TraversalContext.visit (/Users/joedski/SpiderOak Hive/Work/VPS/Repos/virtual-server-site/node_modules/babel-traverse/lib/context.js:190:19)
    at Function.traverse.node (/Users/joedski/SpiderOak Hive/Work/VPS/Repos/virtual-server-site/node_modules/babel-traverse/lib/index.js:114:17)
    at NodePath.visit (/Users/joedski/SpiderOak Hive/Work/VPS/Repos/virtual-server-site/node_modules/babel-traverse/lib/path/context.js:115:19)
    at TraversalContext.visitQueue (/Users/joedski/SpiderOak Hive/Work/VPS/Repos/virtual-server-site/node_modules/babel-traverse/lib/context.js:150:16)
    at TraversalContext.visitSingle (/Users/joedski/SpiderOak Hive/Work/VPS/Repos/virtual-server-site/node_modules/babel-traverse/lib/context.js:108:19)
 @ ./src/stories .stories.js$
 @ ./.storybook/config.js
 @ multi ./node_modules/@storybook/vue/dist/server/config/polyfills.js ./node_modules/@storybook/vue/dist/server/config/globals.js (webpack)-hot-middleware/client.js?reload=true ./.storybook/config.js
```

Seems the JSX thing isn't quite happy.  I guess I should try to not use that at all.  Don't see much of a point when using Vue, anyway, so meh.  Anyway, as [one person pointed out](https://github.com/storybooks/storybook/issues/2727#issuecomment-358582308), just commenting out the "With JSX" part removes that error and allows a proper build, hence the remark about removing all the JSX support.  Don't need a second template language polluting things.


### Adding Stories

Checking the `.storybook/config.js` file, we see this:

```js
const req = require.context('../src/stories', true, /.stories.js$/);
function loadStories() {
  req.keys().forEach(filename => req(filename));
}

configure(loadStories, module);
```

Looks like anything ending with `.stories.js` in `src/stories` is picked up automatically, but no other files.  Hm.  I'll want to come up with a strategy for organizing files, I guess.  I may want to also add Bootstrap-Vue, since the project I'm currently working on uses that, as well as any style overrides because... we have a lot.  Hm.  Guess I'll need to look into globals-setup.
