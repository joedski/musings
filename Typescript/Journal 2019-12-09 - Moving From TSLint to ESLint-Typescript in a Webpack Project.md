Journal 2019-12-09 - Moving From TSLint to ESLint-Typescript in a Webpack Project
========

- It was noted in [a roadmap from the TS people](https://github.com/Microsoft/TypeScript/issues/29288) that they were reallocating effort towards better TS support in ESLint.
- This was further reiterated in [a post by the ESLint folks](https://eslint.org/blog/2019/01/future-typescript-eslint), wherein the [`eslint-typescript`](https://github.com/typescript-eslint/typescript-eslint) project proper was announced.
- Palantir [also annouced](https://medium.com/palantir/tslint-in-2019-1a144c2317a9) that they were reallocating themselves towards supporting Typescript in ESLint.

So, we need to migrate to that in our project at some point.  It'll give us better support for our use case, too.  Mostly the annoying fact that TSLint's `no-unused-vars` rule was overbroad and flagged "unused" methods in our `vue-class-component` based components which included, among other things, component lifecycle hooks.

> Aside: I don't really care for `vue-class-component` because it magically transforms a class into a Vue options component, making it harder to onboard people, but I don't feel strongly enough about it to rewrite the entire codebase nor introduce a whole new style of writing components.  We have enough trouble as is in our codebase cleaning up MVP1 cruft.
>
> That said, TSLint's overbroad and unconfigurable rule does _not_ play into that distaste, rather I see the issue here as being with TSLint's rule itself not being made in such a way that can support a somewhat common use case.
>
> But that's moot in light of the deprecation at the beginning of this year.



## Existing State of Things

Currently, there's only one place where things go from Webpack to TS land: `ts-loader`.  `vue-loader` just punts things over to there, and nothing else deals with TS, so I need to start there.

Okay, on inspecting [the readme of `ts-loader`](https://github.com/TypeStrong/ts-loader/blob/684069ff04a57dc746e383e8b480d30d0e4e8d30/README.md), I quickly get pointed to `fork-ts-checker-webpack-plugin` as well.  That explains why the linting and type checking happen asynchronously from the build.

Reading through [some issues](https://github.com/TypeStrong/ts-loader/issues/910) apparently [support for eslint was added to `fork-ts-checker-webpack-plugin` in july this year](https://blog.johnnyreilly.com/2019/07/typescript-and-eslint-meet-fork-ts-checker-webpack-plugin.html), so that's convenient.  Just need to upgrade to ^1.4.0.  Heh.

Given that the `fork-ts-checker-webpack-plugin` is meant to run in parallel and only do the checking part rather than the actual transpilation part, it should be mostly harmless to update.  On top of that, we're not using it as a library that we built atop, rather it's a build plugin that we configured.



## Migrating to ESLint

[Basically](https://blog.johnnyreilly.com/2019/07/typescript-and-eslint-meet-fork-ts-checker-webpack-plugin.html),

- Update `fork-ts-checker-webpack-plugin` to ^1.4.0
- Install the following dev dependencies:
    - `eslint`
    - `@typescript-eslint/parser`
    - `@typescript-eslint/eslint-plugin`
- Update the `fork-ts-checker-webpack-plugin` config:
    - Replace the `tslint` option with `eslint`.

Then add some eslint config:

```js
const path = require('path');
module.exports = {
    parser: '@typescript-eslint/parser', // Specifies the ESLint parser
    plugins: [
        '@typescript-eslint',
    ],
    env: {
        browser: true,
        jest: true
    },
    extends: [
        'plugin:@typescript-eslint/recommended', // Uses the recommended rules from the @typescript-eslint/eslint-plugin
    ],
    parserOptions: {
        project: path.resolve(__dirname, './tsconfig.json'),
        tsconfigRootDir: __dirname,
        ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
        sourceType: 'module', // Allows for the use of imports
    },
    rules: {
        // Place to specify ESLint rules. Can be used to overwrite rules specified from the extended configs
        // e.g. "@typescript-eslint/explicit-function-return-type": "off",
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
    },
};
```

Customize to taste.

Theoretically simple.



## Actually Linting Everything

So, I sorta got things setup for TS and for our config and repo automation files which are _not_ TS...  And things work well except for vue files.

Maybe [the `parserOptions.parser` option is what's needed](https://eslint.vuejs.org/user-guide/#how-to-use-custom-parser)?

So we'll try that, then:

```
npm install --save-dev eslint vue-eslint-parser
```

```diff
diff --git i/.eslintrc.js w/.eslintrc.js
index 9939a83d..2e4683c2 100644
--- i/.eslintrc.js
+++ w/.eslintrc.js
@@ -17,8 +17,8 @@ module.exports = {
     },
     {
       // enable the rule specifically for src/ and tests/
-      files: ['src/**/*.ts', 'src/**/*.js', 'tests/**/*.ts', 'tests/**/*.js'],
-      parser: '@typescript-eslint/parser', // Specifies the ESLint parser
+      files: ['src/**/*.ts', 'src/**/*.vue', 'src/**/*.js', 'tests/**/*.ts', 'tests/**/*.vue', 'tests/**/*.js'],
+      parser: 'vue-eslint-parser',
       plugins: ['@typescript-eslint'],
       env: {
         browser: true,
@@ -28,6 +28,7 @@ module.exports = {
         'plugin:@typescript-eslint/recommended', // Uses the recommended rules from the @typescript-eslint/eslint-plugin
       ],
       parserOptions: {
+        parser: '@typescript-eslint/parser',
         project: path.resolve(__dirname, './tsconfig.json'),
         tsconfigRootDir: __dirname,
         ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
```

Running with that gives...

```
14:48 $ npx eslint src/App.vue 

/.../src/App.vue
  0:0  error  Parsing error: "parserOptions.project" has been set for @typescript-eslint/parser.
The file does not match your project config: src/App.vue.
The extension for the file (.vue) is non-standard. You should add "parserOptions.extraFileExtensions" to your config

✖ 1 problem (1 error, 0 warnings)
```

Okay, poke things a bit more then...

```diff
diff --git i/.eslintrc.js w/.eslintrc.js
index 9939a83d..09612945 100644
--- i/.eslintrc.js
+++ w/.eslintrc.js
@@ -17,8 +17,9 @@ module.exports = {
     },
     {
       // enable the rule specifically for src/ and tests/
-      files: ['src/**/*.ts', 'src/**/*.js', 'tests/**/*.ts', 'tests/**/*.js'],
-      parser: '@typescript-eslint/parser', // Specifies the ESLint parser
+      // files: ['src/**/*.ts', 'src/**/*.vue', 'src/**/*.js', 'tests/**/*.ts', 'tests/**/*.vue', 'tests/**/*.js'],
+      files: ['src/**/*.vue', 'tests/**/*.vue'],
+      parser: 'vue-eslint-parser',
       plugins: ['@typescript-eslint'],
       env: {
         browser: true,
@@ -28,6 +29,8 @@ module.exports = {
         'plugin:@typescript-eslint/recommended', // Uses the recommended rules from the @typescript-eslint/eslint-plugin
       ],
       parserOptions: {
+        parser: '@typescript-eslint/parser',
+        extraFileExtensions: ['.js', '.ts'],
         project: path.resolve(__dirname, './tsconfig.json'),
         tsconfigRootDir: __dirname,
         ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
```

That gave back the same error.  Reading the error more closely, it's actually complaining about `parserOptions.project`, but is complaining about `.vue` files being non-standard.  Let's change that array to just `.vue`, then?

```diff
diff --git i/.eslintrc.js w/.eslintrc.js
index 9939a83d..09612945 100644
--- i/.eslintrc.js
+++ w/.eslintrc.js
@@ -17,8 +17,9 @@ module.exports = {
     },
     {
       // enable the rule specifically for src/ and tests/
-      files: ['src/**/*.ts', 'src/**/*.js', 'tests/**/*.ts', 'tests/**/*.js'],
-      parser: '@typescript-eslint/parser', // Specifies the ESLint parser
+      // files: ['src/**/*.ts', 'src/**/*.vue', 'src/**/*.js', 'tests/**/*.ts', 'tests/**/*.vue', 'tests/**/*.js'],
+      files: ['src/**/*.vue', 'tests/**/*.vue'],
+      parser: 'vue-eslint-parser',
       plugins: ['@typescript-eslint'],
       env: {
         browser: true,
@@ -28,6 +29,8 @@ module.exports = {
         'plugin:@typescript-eslint/recommended', // Uses the recommended rules from the @typescript-eslint/eslint-plugin
       ],
       parserOptions: {
+        parser: '@typescript-eslint/parser',
+        extraFileExtensions: ['.vue'],
         project: path.resolve(__dirname, './tsconfig.json'),
         tsconfigRootDir: __dirname,
         ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
```

Okay, now running `npx eslint src/App.vue` exits successfully, and an unused import is flagged correctly.

However, now in VSCode, I get this error:

```
Parsing error: "parserOptions.project" has been set for @typescript-eslint/parser.
The file does not match your project config: src/App.vue.
The file must be included in at least one of the projects provided.
```

And I have no idea why.  It's like, I did exactly the thing it told me to, and it's still like "nope".
