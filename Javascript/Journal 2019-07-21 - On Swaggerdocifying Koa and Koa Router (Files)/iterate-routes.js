const Router = require('koa-router');

function listAppRoutes(koaApp) {
  koaApp.middleware.forEach(middleware => {
    const { router } = middleware;
    if (router && router instanceof Router) {
      console.log(`Router: prefix=${router.opts.prefix || ''}`);
      listRouterRoutes(router);
    }
  });
}

function listRouterRoutes(koaRouter, level = 1) {
  const indent = '  '.repeat(level);
  koaRouter.stack.forEach(layer => {
    console.log(`${indent}Layer: path="${layer.path}" methods=[${layer.methods.join(',')}] paramNames=${JSON.stringify(layer.paramNames)} opts=${JSON.stringify(layer.opts || {})}`);
    layer.stack.forEach(middleware => {
      const { router } = middleware;
      if (router && router instanceof Router) {
        console.log(`${indent}  Router: prefix=${router.opts.prefix || ''}`);
        listRouterRoutes(router, level + 2);
      }
    });
  });
}

exports.listAppRoutes = listAppRoutes;
exports.listRouterRoutes = listRouterRoutes;

if (require.main === module) {
  const app = require('./app');
  listAppRoutes(app);
}
