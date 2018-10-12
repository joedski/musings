Rewriting Module Paths in Webpack 3 and 4
=========================================

I recently ran into an issue with an internal library (un) maintained by another team: Their library was a set of Vue components, but these Vue components made use of some utils they extracted out into files in another dir appropriately enough called `utils`.  There was an odd issue, though: It seems that they have separate ES6 versions of their util functions, which during their prepublish step are transpiled into the according pre-ES6 versions.  Although, not completely, as some things like arrow functions still made it through.  Even worse, some of the files in `utils` do not have a separately identified `es6` version: They're just ES6!  Even even worse, some of the imports are written with file extensions and some aren't!  Bluh!

This causes, shall we say, issues, trying to babel-webpack these files.  It also seems to cause problems with IE11, a target we shouldn't typically have trouble with except for unshimmables like Proxy.

The best option would be for this oversight to be rectified in the source library: Since their library is full of untranspiled Vue components, just leave the Utils also untranspiled and let each project use their own transpilation settings.  It's either that or they transpile everything down to the lowest common denominator.

Second best would be to fork the repo, something I may consider bringing up as a possibility to the rest of the team.  This however has a couple issues:
- It exacerbates the polyforkosis of the library, leading to even less incentive to maintain it
- It doesn't solve it at the main library everyone knows about

In the mean time, I'm going to look for less intrusive options.  For this reason, I'm ruling out things like:
- The Aforementioned Forking and Editing
- Manually patching on post-install
- Copying the utils to our repo and pointing the components to those instead

This basically leaves me with one option: Somehow rewrite the import paths.

It looks like this can be done with the [NormalModuleReplacementPlugin](https://webpack.js.org/plugins/normal-module-replacement-plugin/). (NOTE: Link as of 2018-10-12.  May be broken later due to shifting docs URLs or plugin being removed.)  Basic rewrites can be done with `resolve.alias`, but this doesn't seem to allow for rewriting based on files that may or may not exist.

`NormalModuleReplacementPlugin` doesn't really seem to have much documentation about how the replacement function works, other than saying "If `newResource` is a function, it is expected to overwrite the `request` attribute of the supplied `resource`.", so I'm going to have to poke away at that myself.



## Experiment: Logging Out the Resource Object


### Initial Exploration

So from the docs, I knew that we had a `resource.request` property, which was the requested module.  That's it, though.  I decided to just use it and log things out to see if I could find out more.

```js
new webpack.NormalModuleReplacementPlugin(
  /utils\//,
  function (resource) {
    console.log(`REQUEST
  ${Object.keys(resource).join(',')}
  ${resource.request}
`)
  }
)
```

In the output, I can see two seemingly distinct shapes:
- One which has fewer props and the actual request as written in the import statement for its `request`
- One which has more props and a fully reified file path for its `request`


### Further Refinement

Based on the discovery of two separate forms of resources, and the fact that they seem to be related in number and path, I decided to call these "Initial Requests" and "Full Requests".

I changed the logging thus:

```js
new webpack.NormalModuleReplacementPlugin(
  /utils\//,
  function (resource) {
    if ('rawRequest' in resource) {
      console.log(`FULL REQUEST
  request = ${resource.request}
  context = ${resource.context}
  rawRequest = ${resource.rawRequest}
  userRequest = ${resource.userRequest}
`)
    }
    else {
      console.log(`INITIAL REQUEST
  request = ${resource.request}
  context = ${resource.context}
  contextInfo = ${JSON.stringify(resource.contextInfo)}
`)
    }
  }
)
```

This gave me a bunch of nicely formatted lines like:

```
INIT REQUEST
  request = @/utils/AsyncData
  context = /.../OUR_PROJECT/src/mixins
  contextInfo = {"issuer":"/.../OUR_PROJECT/src/mixins/AsyncDataMixin.js"}

FULL REQUEST
  request = /.../OUR_PROJECT/node_modules/babel-loader/lib/index.js!/.../OUR_PROJECT/node_modules/eslint-loader/index.js??ref--0!/.../OUR_PROJECT/src/utils/AsyncData.js
  context = /.../OUR_PROJECT/src/mixins
  rawRequest = @/utils/AsyncData
  userRequest = /.../OUR_PROJECT/src/utils/AsyncData.js

INIT REQUEST
  request = ./utils/NodeList.js
  context = /.../OUR_PROJECT/node_modules/UI_LIBRARY/src
  contextInfo = {"issuer":"/.../OUR_PROJECT/node_modules/UI_LIBRARY/src/Dropdown.vue"}

INIT REQUEST
  request = ./utils/utils.js
  context = /.../OUR_PROJECT/node_modules/UI_LIBRARY/src
  contextInfo = {"issuer":"/.../OUR_PROJECT/node_modules/UI_LIBRARY/src/ToggleButton.vue"}

FULL REQUEST
  request = /.../OUR_PROJECT/node_modules/UI_LIBRARY/src/utils/NodeList.js
  context = /.../OUR_PROJECT/node_modules/UI_LIBRARY/src
  rawRequest = ./utils/NodeList.js
  userRequest = /.../OUR_PROJECT/node_modules/UI_LIBRARY/src/utils/NodeList.js

FULL REQUEST
  request = /.../OUR_PROJECT/node_modules/UI_LIBRARY/src/utils/utils.js
  context = /.../OUR_PROJECT/node_modules/UI_LIBRARY/src
  rawRequest = ./utils/utils.js
  userRequest = /.../OUR_PROJECT/node_modules/UI_LIBRARY/src/utils/utils.js
```

The files in the Library Utils folder aren't being Babelificated.  They're probably still not being included in the module rules for JS files so I'll need to check that.

Yep, they're in an `exclude` option.  Remove that and it should list them with the babel loader.  I also decided to add a check for the library in the `resource.context` prop because that seems to be there.

Thus, my plugin call looks like this:

```js
new webpack.NormalModuleReplacementPlugin(
  /utils\//,
  function (resource) {
    if (!resource.context.includes('/node_modules/UI_LIBRARY/')) return

    if ('rawRequest' in resource) {
      console.log(`FULL REQUEST
request = ${resource.request}
context = ${resource.context}
rawRequest = ${resource.rawRequest}
userRequest = ${resource.userRequest}
`)
    }
    else {
      console.log(`INITIAL REQUEST
request = ${resource.request}
context = ${resource.context}
contextInfo = ${JSON.stringify(resource.contextInfo)}
`)
    }
  }
)
```

And now I get things like this:

```
INITIAL REQUEST
  request = ./utils/NodeList.js
  context = /.../OUR_PROJECT/node_modules/UI_LIBRARY/src
  contextInfo = {"issuer":"/.../OUR_PROJECT/node_modules/UI_LIBRARY/src/Input.vue"}

INITIAL REQUEST
  request = ./utils/utils.js
  context = /.../OUR_PROJECT/node_modules/UI_LIBRARY/src
  contextInfo = {"issuer":"/.../OUR_PROJECT/node_modules/UI_LIBRARY/src/Input.vue"}

INITIAL REQUEST
  request = ./utils/utils.js
  context = /.../OUR_PROJECT/node_modules/UI_LIBRARY/src
  contextInfo = {"issuer":"/.../OUR_PROJECT/node_modules/UI_LIBRARY/src/Tabs.vue"}

FULL REQUEST
  request = /.../OUR_PROJECT/node_modules/babel-loader/lib/index.js!/.../OUR_PROJECT/node_modules/UI_LIBRARY/src/utils/NodeList.js
  context = /.../OUR_PROJECT/node_modules/UI_LIBRARY/src
  rawRequest = ./utils/NodeList.js
  userRequest = /.../OUR_PROJECT/node_modules/UI_LIBRARY/src/utils/NodeList.js

FULL REQUEST
  request = /.../OUR_PROJECT/node_modules/babel-loader/lib/index.js!/.../OUR_PROJECT/node_modules/UI_LIBRARY/src/utils/utils.js
  context = /.../OUR_PROJECT/node_modules/UI_LIBRARY/src
  rawRequest = ./utils/utils.js
  userRequest = /.../OUR_PROJECT/node_modules/UI_LIBRARY/src/utils/utils.js

FULL REQUEST
  request = /.../OUR_PROJECT/node_modules/babel-loader/lib/index.js!/.../OUR_PROJECT/node_modules/UI_LIBRARY/src/utils/utils.js
  context = /.../OUR_PROJECT/node_modules/UI_LIBRARY/src
  rawRequest = ./utils/utils.js
  userRequest = /.../OUR_PROJECT/node_modules/UI_LIBRARY/src/utils/utils.js
```

Thus our project's own utils are filtered out from consideration.  I think that's enough to move forward.



## Actual Rewrites

I know from a prior undocumented experiment that overwriting the full request didn't seem to work, so instead I'll try this:
- Add `.es6.js` before `.js` in the `resolve.extensions` Webpack option.
- Delete recognized file extensions off of any file requests in Initial Requests.

Thus, the webpack config looks something like this:

```js
module.exports = {
  // ...
  resolve: {
    extensions: ['.es6.js', '.js', '.vue', '.json'],
    // ...
  },
  plugins: [
    new webpack.NormalModuleReplacementPlugin(
      /utils\//,
      function (resource) {
        // Only modify ui library utils requests
        if (!resource.context.includes('/node_modules/UI_LIBRARY/')) return
        // Only manipulate initial requests
        if ('rawRequest' in resource) {
          console.log(`UI Library Utils Path: ${resource.request}`)
          return
        }

        if (/\.(js|es6\.js|vue|json)$/.test(resource.request)) {
          const oldRequest = resource.request
          const newRequest = oldRequest.replace(/\.(js|es6\.js|vue|json)$/, '')
          console.log(`UI Library Utils Path Rewrite: "${oldRequest}" -> "${newRequest}"`)
          resource.request = newRequest
        }
        else {
          console.log(`UI Library Utils Path: ${resource.request}`)
        }
      }
    ),
    // ...
  ],
}
```

This seems to work, as indicated by the console output:

```
UI Library Path Rewrite: "./utils/utils.js" -> "./utils/utils"
UI Library Path Rewrite: "./utils/NodeList.js" -> "./utils/NodeList"
UI Library Path Rewrite: "./utils/utils.js" -> "./utils/utils"
UI Library Path: /.../OUR_PROJECT/node_modules/babel-loader/lib/index.js!/.../OUR_PROJECT/node_modules/UI_LIBRARY/src/utils/utils.es6.js
UI Library Path: /.../OUR_PROJECT/node_modules/babel-loader/lib/index.js!/.../OUR_PROJECT/node_modules/UI_LIBRARY/src/utils/utils.es6.js
UI Library Path: /.../OUR_PROJECT/node_modules/babel-loader/lib/index.js!/.../OUR_PROJECT/node_modules/UI_LIBRARY/src/utils/NodeList.es6.js
```

No additional error messages, either.



## Windows

Interestingly, this setup completely failed on Windows.  It turns out that `resource.context` is in the OS-native path format.  In order to support this, then, I need to build the paths to check in an OS independent manner.

Thus, the plugin becomes:

```js
new webpack.NormalModuleReplacementPlugin(
  /utils\//,
  function (resource) {
    // Only modify ui library utils requests
    if (!(
      resource.context.includes(path.sep + path.join('node_modules', 'UI_LIBRARY') + path.sep)
    )) {
      return
    }
    // Only manipulate initial requests
    if ('rawRequest' in resource) {
      console.log(`UI Library Utils Path: ${resource.request}`)
      return
    }

    if (/\.(js|es6\.js|vue|json)$/.test(resource.request)) {
      const oldRequest = resource.request
      const newRequest = oldRequest.replace(/\.(js|es6\.js|vue|json)$/, '')
      console.log(`UI Library Utils Path Rewrite: "${oldRequest}" -> "${newRequest}"`)
      resource.request = newRequest
    }
    else {
      console.log(`UI Library Utils Path: ${resource.request}`)
    }
  }
),
```

I suppose it could be argued that the context check is fragile even with the OS-independent path checking, though, and that making such an adjustment (deleting file extensions) is a noop on our own imports since we don't include file extensions.

I haven't checked if a Full Request's `resource.request` prop is also in OS-dependent form, but it may very well be, which could be why that first undocumented experiment failed in the target environment.

That also makes me wonder what that first regex operates on, the `rawRequest` or something else?
