Inlining an App that Uses Dynamic Import in Webpack 3
=====================================================

We're stuck on Webpack 3 right now because Webpack 4 will require non-trivial changes to the config, in terms of the config itself and validating that all the plugins are working or can be updated.

Situation here:
- I want to inline the app entry-point script into our HTML.
- Our app makes use of code splitting with dynamic `import()`.
- We're using [`html-webpack-plugin@^2.28.0`](https://github.com/jantimon/html-webpack-plugin).

Things tried so far:
- I've tried [`script-ext-html-webpack-plugin`](https://github.com/numical/script-ext-html-webpack-plugin).
    - **Result: It didn't work**, it seemed to inline the whole app script rather than just the entry point, which subsequently resulted in a 404 error on trying to dynamically load the main app code.
- I looked at [`html-webpack-inline-source-plugin`](https://github.com/DustinJackson/html-webpack-inline-source-plugin) but it says "requires … version 4 or higher", which given that `html-webpack-plugin` doesn't have a version 4.x as of writing (2019-01-31) I shall assume means Webpack 4.
    - Mmmmmmaybe I'll try it anyway?

Things to try:
- Just don't bother and hope the one fewer request per iframe is fine.
- Try just sticking `html-webpack-inline-source-plugin` in anyway and see if it dies. (it probably will, but eh.)
    - If necessary, try upgrading `html-webpack-plugin` to `^3.2.0`?
- [Upgrade to Webpack 4](https://webpack.js.org/migrate/4/).
    - It looks like for the most part this should be just checking the plugins.  At the same time, checking the plugins was the part I was most worried about, sooo...

I don't like the first one, so I'm going to treat that as a last resort, even after "Upgrading Webpack".


### Try Just Sticking `html-webpack-inline-source-plugin` In And Pray

Gonna do it.

```
ERROR | uncaughtException: The HtmlWebpackInlineSourcePlugin does not accept any options
```

`>:(`

Okay, but, `new HtmlWebpackInlineSourcePlugin(HtmlWebpackPlugin)` is totally what their docs say.  Did the wrong one get installed due to naming?  Is this plugin even published?

It is, but the latest version is `0.0.10`, and it hasn't been touched for 2 years save for some TS typings.  `0.0.10` does not have any arguments in the constructor.

Okay, removing that, everything seems to work.  I wonder, though.  In this case, I used a more restrictive pattern, `'\\bapp\\.js'`, whereas before I just used `'app'`, which will also match against `0.main-app.bundle.js`.  Maybe if I apply this to the original `script-ext-html-webpack-plugin` plugin?

Wha-hey, it works.

Gonna rename the main `app` bundle to something less likely to conflict.  Maybe `app-bundle`?  ... Yeah.  The bundle-bundle.
