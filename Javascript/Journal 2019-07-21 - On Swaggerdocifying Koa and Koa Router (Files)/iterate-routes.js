const Router = require('koa-router');
const pathToRegexp = require('path-to-regexp');

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

function eachRoute(app, fn) {
  app.middleware.forEach(middleware => {
    const { router } = middleware;
    eachRouterRoute(router, fn);
  });
}

function eachRouterRoute(router, fn) {
  router.stack.forEach(layer => {
    fn(layer);
  });
}

function collectRoutes(app) {
  const routes = [];

  eachRoute(app, (layer) => {
    const middlewareWithApiDoc = layer.stack.find(it => it.apiDoc);

    const routeDef = {
      path: openApiPathOfLayer(layer),
      koaPath: layer.path,
      methodName: middlewareWithApiDoc ? middlewareWithApiDoc.name : null,
      methods: layer.methods.slice(),
      params: JSON.parse(JSON.stringify(layer.paramNames)),
      apiDoc: middlewareWithApiDoc ? middlewareWithApiDoc.apiDoc : null,
      layer,
    };

    routes.push(routeDef);
  });

  return routes;
}

function openApiPathOfLayer(layer) {
  const tokens = pathToRegexp.parse(layer.path, layer.opts);
  const strictPath = tokens.reduce(
    (acc, part, partIndex) => {
      if (typeof part === 'string') {
          return acc + part;
      }

      if (typeof part === 'object' && part) {
          // OpenAPI only puts the name in the path, nothing like repetition modifiers, etc.
          return acc + `${part.prefix}{${part.name}}`;
      }

      throw new Error(`Unrecognized path part at index ${partIndex}`);
    },
    ''
  );

  if (layer.opts.strict) {
    return strictPath;
  }

  if (strictPath.endsWith('/')) {
    return strictPath.substr(0, strictPath.length - 1);
  }

  return strictPath;
}

exports.listAppRoutes = listAppRoutes;
exports.listRouterRoutes = listRouterRoutes;

if (require.main === module) {
  const app = require('./app');
  // listAppRoutes(app);
  const routes = collectRoutes(app);
  routes.forEach(route => {
    // Skip general/unspecified routes
    if (! route.methods.length) return;

    console.log(`${route.methods.join(',')} ${route.path}
  koaPath: ${route.koaPath}
  controllerMethod.name: ${route.methodName}
  params:${
    route.params.length
    ? '\n' + indent(2, route.params.map(it => `${it.name}: ` + JSON.stringify(it)).join('\n'))
    : ''}
  apiDoc:${
    route.apiDoc
    ? '\n' + indent(2, JSON.stringify(route.apiDoc, null, 2))
    : ' null'}`);
  });
}
