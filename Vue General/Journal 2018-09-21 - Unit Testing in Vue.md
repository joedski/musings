Unit Testing in Vue
===================

AKA Vuenit Testing.

We can start out with [their docs on unit testing](https://vuejs.org/v2/guide/unit-testing.html).

It seems like it should be pretty easy, just create some test components, call `$mount()` on them, and be done with it:

```js
// Their example unit test:
describe('Hello.vue', () => {
  it('should render correct contents', () => {
    const Constructor = Vue.extend(Hello)
    const vm = new Constructor().$mount()
    expect(vm.$el.querySelector('.hello p').textContent)
      .to.equal('Welcome to Your Predix Ready Vue.js App')
  })
})
```



## SyntaxError: Unexpected token 'const'

I'm running into an error, though:

```
PhantomJS 2.1.1 (Mac OS X 0.0.0) ERROR
  SyntaxError: Unexpected token 'const'
  at webpack:///~/our-component-library/src/utils/array.js:3:0 <- index.js:27183
```

Well, that's not good.  Googling this error for PhantomJS and Karma turns up Vue related results immediately, so I'm not the first one by far.

- [SyntaxError: Unexpected token 'const' (with Vue, Karma, Webpack, PhantomJS)](https://stackoverflow.com/questions/40747123/syntaxerror-unexpected-token-const-with-vue-karma-webpack-phantomjs)

This seems to turn up something actually immediately relevant.  Looking at our `webpack.base.conf.js` we have this for JS:

```js
module.exports = {
  module: {
    rules: [
      // ...
      {
        test: /\.js$/,
        loader: 'babel-loader',
        include: [resolve('src'), resolve('test'), resolve('node_modules/our-component-library/src')],
        exclude: [resolve('node_modules/our-component-library/src/utils')]
      },
      // ...
    ]
  }
}
```

Lookee there, the error is coming from a file within `our-component-library/src/utils`.  Why is that excluded, though?  I'll just change that to be conditional and see if that works:

```js
module.exports = {
  module: {
    rules: [
      // ...
      {
        test: /\.js$/,
        loader: 'babel-loader',
        include: [resolve('src'), resolve('test'), resolve('node_modules/our-component-library/src')],
        exclude: process.env.NODE_ENV === 'test'
          ? []
          : [resolve('node_modules/our-component-library/src/utils')]
      },
      // ...
    ]
  }
}
```

> NOTE: I eventually moved this to a separate test config so I didn't need to set `NODE_ENV=test`.

Of course, that changes the test command to `NODE_ENV=test npm run unit` but that can be fixed.

That gives us a new error:

```
PhantomJS 2.1.1 (Mac OS X 0.0.0) ERROR
  Error: Cannot find module "@/components/Hello"
  at webpack:///test/unit/specs/Hello.spec.js:2:0 <- index.js:35511
```

Which makes sense because we deleted that component a long while back.  Let's just delete that test.  Aaaand error.

```
PhantomJS 2.1.1 (Mac OS X 0.0.0) ERROR
  Error: Module parse failed: /.../mixins/ExampleMixin.md Unexpected token (1:10)
  You may need an appropriate loader to handle this file type.
  | Example Mixin
  | =============
  |
  at index.js:128285
```

Eeh, why's it trying to load the markdown file?  Maybe if I just ignore those...

```js
// in webpack.test.conf.js

var webpackConfig = merge(baseConfig, {
  // use inline sourcemap for karma-sourcemap-loader
  module: {
    rules: utils.styleLoaders()
  },
  devtool: '#inline-source-map',
  plugins: [
    new webpack.DefinePlugin({
      'process.env': require('../config/test.env')
    }),
    // Add this here to ignore .md files
    new webpack.IgnorePlugin(/\.md$/i)
  ]
})

// ...

module.exports = webpackConfig
```

That at least gives a different error:

```
PhantomJS 2.1.1 (Mac OS X 0.0.0) ERROR
  Error: [vuex] vuex requires a Promise polyfill in this browser.
  at webpack:///~/vuex/dist/vuex.esm.js:97:0 <- index.js:1144

PhantomJS 2.1.1 (Mac OS X 0.0.0): Executed 0 of 0 ERROR (0.846 secs / 0 secs)
```

[This answer](https://github.com/vuejs-templates/webpack/issues/474#issuecomment-292590455) suggests adding the Babel Polyfill to the files entry in the Karma config:

```js
module.exports = function (config) {
  config.set({
    // ...
    files: [
      // Add the polyfill first
      '../../node_modules/babel-polyfill/dist/polyfill.js',
      // Then do our tests
      './index.js'
    ],
    // ...
  })
}
```

This gives a different error, but at least it's in the test:

```
21 09 2018 13:38:51.222:INFO [PhantomJS 2.1.1 (Mac OS X 0.0.0)]: Connected on socket 12345678TotallyASocket with id 9876543

  ExampleMixin
    ✗ should not break components rendering
	undefined is not a constructor (evaluating 'expect(vm).toExist()')
	webpack:///test/unit/specs/ExampleMixin.spec.js:97:4 <- index.js:35487:23


PhantomJS 2.1.1 (Mac OS X 0.0.0): Executed 1 of 1 (1 FAILED) ERROR (0.461 secs / 0.033 secs)
```

Eeeeh, right, we're using Chai, not Jest.  Change that to `expect(vm).to.exist`...

```
21 09 2018 13:48:15.107:INFO [PhantomJS 2.1.1 (Mac OS X 0.0.0)]: Connected on socket 234567890DifferentSocket with id 8765432

  ExampleMixin
    ✓ should not break components rendering

PhantomJS 2.1.1 (Mac OS X 0.0.0): Executed 1 of 1 SUCCESS (0.218 secs / 0.035 secs)
TOTAL: 1 SUCCESS
```



## Some Time Passed: Now Things Are Broken Again

I came back today and ... unit testing is broken again?

Okay, enough swearing, what happened?  Nothing intentional, I'm betting, but first I was getting a bunch of Less-Loader errors, and now it's complaining about `const` not being an expected token again.

Looks like a related project being included as a dependency isn't committed with transpiled artifacts, and this kills Karma/PhantomJS.  Welp.  Pass that one through Babel too.

Okay, tests work now.  Not sure what the Less loader thing was about, but it's gone now, so yay?
