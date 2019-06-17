---
tags:
    - webpack
    - single-page-application
---

Journal 2019-06-17 - Webpack Dev Middleware and EJS (or other) Templates
========

- I'm writing a SPA.
- I'd like to embed some information into the HTML (prehydration, app environment, etc) to shave off another HTTP Request because it's still HTTP/1.
- I'm developing with Webpack.
- Both the Dev Server and Deployed Server are based on Express.

Sources:

1. [One person's solution to having their Webpack Cake and EJSing it too](https://github.com/webpack/webpack-dev-middleware/issues/88#issuecomment-249352019)
