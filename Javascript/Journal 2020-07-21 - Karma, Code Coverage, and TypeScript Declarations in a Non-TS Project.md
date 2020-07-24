Journal 2020-07-21 - Karma, Code Coverage, and TypeScript Declarations in a Non-TS Project
========

> TL;DR: Our Test Entry Point file used [`require.context()`](https://webpack.js.org/guides/dependency-management/#requirecontext), but that includes all files regardless of anything else.  Adding `.*\.d\.ts` to the negative lookahead neatly resolved things.

Hm.  I added a `.d.ts` file and it broke unit tests.  Why?  What's importing a `.d.ts` file?  Certainly not the TS compiler because that's not even being run.

```
  Uncaught Error: Module parse failed: /Users/me/project/src/someDeclarationFile.d.ts Unexpected token (1:7)
  You may need an appropriate loader to handle this file type.
```



## Is It Karma Config?

I tried looking at the Karma config, but so far as I can tell it's only interested in what test files it needs to run, and doesn't care about anyhing else.

I even tried adding `exclude: ['**/*.d.ts']` to it, but that did nothing because of the above: no test files are type declaration files, only source files include some declaration files, so this line causes no exclusions.

It does however use our `webpack.test.config.js`, so maybe there's something in there?



## Is It Our Webpack Test Config?

This is a very small modification of our base Webpack config, and the base config only tries the extensions `.js`, `.vue`, and `.json` in that order.  Any other extension requires an explicitly written extension in the import line.

Okay, so, what else?



## Is It Our Test Entry Point?

Our Karma config points at `./index.js` as our test file, and that file uses [Webpack's `require.context()` thingy](https://webpack.js.org/guides/dependency-management/#requirecontext).  Notably we have this to import all source files _except for any file named `main.js`_:

```js
const srcContext = require.context(
    '../../src',
    true,
    /^\.\/(?!main(\.js)?$)/
);
srcContext.keys().forEach(srcContext);
```

That `main(\.js)?$` part is in a negative assertion, and accounts for both `main` and `main.js`.  Maybe if I just add `\.d\.ts` along side that?

```js
const srcContext = require.context(
    '../../src',
    true,
    /^\.\/(?!main(\.js)?$|.*\.d\.ts$)/
);
srcContext.keys().forEach(srcContext);
```

Yep, that worked.  Cool.

I don't anticipate needing to remove that since declaration files contain no testable code, unless we're going to start unit testing types which would be nice, but admittedly very niche.
