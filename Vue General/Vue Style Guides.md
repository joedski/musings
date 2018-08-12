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

Looks like anything ending with `.stories.js` inside of `src/stories` is picked up automatically, due to the configuration in `.storybook/config.js`, but no other files.  Hm.  I'll want to come up with a strategy for organizing files, I guess.  I may want to also add Bootstrap-Vue, since the project I'm currently working on uses that, as well as any style overrides because... we have a lot.  Hm.  Guess I'll need to look into globals-setup.

Looking at [the docs for `require.context`](https://webpack.js.org/guides/dependency-management/) I see that the second argument being `true` means this also recurs through all subdirs in `src/stories`.  Okay, that's pretty convenient.  That should inform any strategies, then, I think.

#### Webpack Aliases

```
ERROR in ./src/stories/components/(...).js
Module not found: Error: Can't resolve '@/...' in '/.../project/src/stories/components'
```

We have a project setup in typical Vue fashion, with `@/...` being used for our project's paths.  Very convenient, doesn't polute the config namespace, explicit, etc.  Problem is, Storybook doesn't come with that out of the box, hence the error above.

It looks like you can [extend Storybook's own default config](https://storybook.js.org/configurations/custom-webpack-config/#full-control-mode--default).  I might want to do this, modifying their config to add just the aliases from our own config.  This should be easy, if the paths are setup right...  I think they are.  Our webpack config is setup to get paths relative to the webpack config itself, so importing it should be no problem.  Excellent.

```js
const projectConfig = require('../build/webpack.base.conf.js')

module.exports = (baseConfig, env, defaultConfig) => {
  // Copy our aliases over.
  Object.assign(defaultConfig.resolve.alias, projectConfig.resolve.alias);

  defaultConfig.resolve.modules || []

  const newModulesDirs = projectConfig.resolve.modules
    .filter(modulesDir => defaultConfig.resolve.modules.includes(modulesDir))

  defaultConfig.resolve.modules =
    newModulesDirs.concat(defaultConfig.resolve.modules)

  return defaultConfig
}
```

Let's try that on for size.

Works.  Excellent.

This means we can now add new files `src/stories/` and they'll be automatically picked up.



## Global Setup

Okay, so, two goals:
- [ ] Add Bootstrap-Vue globals to Storybook config
- [ ] Setup purely example chart as smoke test

From there, I can continue to the actual main goal:
- Setup the baseline unfancy VM stats chart


### Adding Bootstrap-Vue Globals

I guess this is comprised of two parts:
- [ ] Add the components to Vue
- [ ] Add the styles

I think part of this will involve their decorator api, demoed in their [addon docs](https://storybook.js.org/addons/using-addons/), however that demo only shows usage with React.  Apparently it is [not yet documented how you do this with Vue](https://github.com/storybooks/storybook/issues/1653), meaning you have to follow [the example in that issue there](https://github.com/storybooks/storybook/issues/1653#issuecomment-373368760).  Hopefully that will be rectified sooner than later, but it's one part that seems to be lacking in their docs.  Heck, I hardly see anything about `addDecorator` itself, even for React things.

It looks though like we just do this:

```js
import { addDecorator } from '@storybook/vue';

addDecorator(() => ({
  template: `<div>
    <!-- here's where content is injected. -->
    <story />
  </div>`
}))
```

Simple enough, then, I guess.  I'm going to have to break out the styles and such out of our project's `src/App.vue` component, probably put it in `src/components/containers/AppContainer.vue` or something.  Although, looking at it, I only need the styles, so I could just move that to a separate SCSS file: `src/App.scss`.  That seems nicer, means I don't have to modify our app's component tree by adding yet another wrapper.  Our DOM tree gets deep enough as is.

I created a barebones component:

```html
<template>
  <div>
    <story />
  </div>
</template>

<script type="text/javascript">
export default {}
</script>

<style media="screen">
@import "~@/App.scss";
</style>
```

Then added these lines to `.storybook/config.js`:

```js
import TopLevelDecorator from '@/stories/TopLevelDecorator';
addDecorator(() => TopLevelDecorator);
```

Aaaaaaaand ... error!

```
ERROR in ./node_modules/css-loader?sourceMap!./node_modules/vue-loader/lib/style-compiler?{"vue":true,"id":"data-v-ac9b8d32","scoped":false,"hasInlineConfig":false}!./node_modules/vue-loader/lib/selector.js?type=styles&index=0!./src/stories/TopLevelDecorator.vue
Module build failed: Error: Failed to find '~@/App.scss'
```

Dang.

Okay, how about if instead of `~@/App.scss` I do `../App.scss`?

```
CssSyntaxError {
  name: 'CssSyntaxError',
  reason: 'Unknown word',
  file: '/.../src/App.scss',
  source: '// Broken into a separate file for easy import by storybook.\n\n$fa-font-path: \'~font-awesome/fonts/\';\n@import \'~font-awesome/scss/font-awesome\';\n$simple-line-font-path: \'~simple-line-icons/fonts/\';\n@import \'~simple-line-icons/scss/simple-line-icons\';\n@import \'~bootstrap-vue/dist/bootstrap-vue\';\n\n// Import Main styles for this application\n@import \'~@/scss/style\';\n',
  line: 9,
  column: 1,
  message: 'postcss-import: /.../src/App.scss:9:1: Unknown word',
  input:
   { line: 9,
     column: 1,
     source: '// Broken into a separate file for easy import by storybook.\n\n$fa-font-path: \'~font-awesome/fonts/\';\n@import \'~font-awesome/scss/font-awesome\';\n$simple-line-font-path: \'~simple-line-icons/fonts/\';\n@import \'~simple-line-icons/scss/simple-line-icons\';\n@import \'~bootstrap-vue/dist/bootstrap-vue\';\n\n// Import Main styles for this application\n@import \'~@/scss/style\';\n',
     file: '/.../src/App.scss' },
  plugin: 'postcss-import' }
```

Er, what?  Line 9, column 1, is a `/` beginning a `//` comment.  So, uh, what?

... Okay, well, removing the line comments worked, I think, but didn't actually import anything.  Hmmm.  Oh, wait, durr, I forgot to tell Vue Loader that it's SCSS, not CSS.

Boooooooooom, styles.

```
vue.esm.js:578 [Vue warn]: Unknown custom element: <b-container> - did you register the component correctly?
```

Well, right, I didn't register the components yet.  [Those are added in `.storybook/config.js`](https://storybook.js.org/basics/guide-vue/#create-the-config-file).

Hmmm, looks like it doesn't like how I vendored Axios... Dang.  Gives me the error `"export 'default' (imported as 'axios') was not found in 'axios'`.  It didn't die, though, so maybe I can get away with just not using Axios?  At least until I figure out something better.

Actually, getting a run time error, too:

```
Uncaught TypeError: Cannot read property 'create' of undefined
    at Object.<anonymous> (requestors.js:14)
    at __webpack_require__ (bootstrap ccf978503a8b81e93e65:678)
    at fn (bootstrap ccf978503a8b81e93e65:88)
    at Object.<anonymous> (index.js:1)
    at __webpack_require__ (bootstrap ccf978503a8b81e93e65:678)
    at fn (bootstrap ccf978503a8b81e93e65:88)
    at Object.<anonymous> (main.configure-vue.js:1)
    at __webpack_require__ (bootstrap ccf978503a8b81e93e65:678)
    at fn (bootstrap ccf978503a8b81e93e65:88)
    at Object.<anonymous> (config.js:1)
```

That's breaking because the `axios` vendored module is not exporting.  Hmmm.

Google Research:
- https://github.com/webpack/webpack/issues/4817
  - Doesn't really solve the issue, other than to say that you should change `exports.default = ...` to `export default ...`.  That's annoying.

Haven't really found anything else that seems relevant.  Guess I'll just remove the async plugin.  That requires requesting things, anyway.  Bah.

Separating out the offending module works.  Okay, so, there's that I guess.
