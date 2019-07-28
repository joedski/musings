const Router = require('koa-router');

function indent(level, string) {
  const indentString = '  '.repeat(level);
  return string.split('\n').map(s => indentString + s).join('\n');
}

function listAppRoutes(koaApp) {
  koaApp.middleware.forEach(middleware => {
    const { router } = middleware;
    if (router && router instanceof Router) {
      listRouterRoutes(router, 0);
    }
  });
}

function listRouterRoutes(koaRouter, level = 1) {
  console.log(indent(level, `Router: prefix=${koaRouter.opts.prefix || ''}`));

  koaRouter.stack.forEach(layer => {
    console.log(indent(level + 1, `Layer:
  path="${layer.path}"
  methods=[${layer.methods.join(',')}]
  paramNames=${
    layer.paramNames.length
    ? '\n' + indent(level + 2, layer.paramNames.map(it => JSON.stringify(it)).join('\n'))
    : ''
}
  opts=${JSON.stringify(layer.opts || {})}
  middleware=`));
    layer.stack.forEach(middleware => {
      const { router } = middleware;
      if (router && router instanceof Router) {
        listRouterRoutes(router, level + 3);
      } else {
        console.log(indent(level + 3, '(fn)'));
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
