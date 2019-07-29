const createFluentize = require('./fluentize');

const paramProto = {};
const fluentize = createFluentize(paramProto);

Object.assign(paramProto, {
  path: fluentize((self, name, schema) => {
    Object.assign(self, {
      in: 'path',
      // OpenAPI specifies that path params are always required.
      required: true,
      name
    });
    self.schema(schema);
  }),
  query: fluentize((self, name, schema) => {
    Object.assign(self, {
      in: 'query',
      name,
    });
    self.schema(schema);
  }),
  header: fluentize((self, name, schema) => {
    Object.assign(self, {
      in: 'header',
      name,
    });
    self.schema(schema);
  }),
  cookie: fluentize((self, name, schema) => {
    Object.assign(self, {
      in: 'cookie',
      name,
    });
    self.schema(schema);
  }),
  schema: fluentize((self, schema) => {
    if (schema) {
      self.schema = schema;
    }
  }),
  jsonContent: fluentize((self, schema) => {
    if (schema) {
      if (self.content === paramProto.content) {
        self.content = {};
      }
      self.content['application/json'] = { schema };
    }
  }),
});


module.exports = paramProto;
