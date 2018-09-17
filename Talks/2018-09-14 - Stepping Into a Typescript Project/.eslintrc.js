// Just a repo-wide eslintrc to make eslint work.
// Minimally opinionated, except for braces
// because stroustrup is better because I like it more
// and 1tbs is dumb because I don't like it.

// Be sure to install the extra eslint deps:
//   npm install --save-dev eslint eslint-plugin-vue babel-eslint

module.exports = {
  root: true,

  parserOptions: {
    ecmaVersion: 2017,
  },

  extends: [
    'eslint:recommended',
  ],

  env: {
    node: true,
    browser: true,
  },

  rules: {
    'brace-style': ['error', 'stroustrup'],
  },
}
