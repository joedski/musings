// Just a repo-wide eslintrc to make eslint work.

module.exports = {
  root: true,

  parserOptions: {
    ecmaVersion: 2018,
    // sourceType: 'module',
  },

  extends: [
    'eslint:recommended',
  ],

  env: {
    node: true,
    browser: true,
    // Map, Symbol, etc.
    es6: true,
  },
}
