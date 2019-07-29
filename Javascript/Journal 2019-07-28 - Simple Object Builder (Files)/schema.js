const createFluentize = require('./fluentize');

const schemaProto = {};
const fluentize = createFluentize(schemaProto);

Object.assign(schemaProto, {
  // Amusingly, no need for toJSON(): these are all on the prototype,
  // and so are not serialized.

  clone() {
    return schema(this);
  },

  // NOTE: these three will get shadowed when used... Hm.

  enum: fluentize((self, ...values) => {
    self.enum = values;
  }),

  const: fluentize((self, value, props) => {
    Object.assign(self, props, {
      const: value,
    });
  }),

  type: fluentize((self, type, props) => {
    // TODO: validate type
    Object.assign(self, props, {
      type,
    });
  }),

  ref: fluentize((self, refPath) => {
    self.$ref = refPath;
  }),

  // Basic Types

  integer: fluentize((self, props) => {
    schemaProto.type.call(self, 'integer', props);
  }),

  number: fluentize((self, props) => {
    schemaProto.type.call(self, 'number', props);
  }),

  null: fluentize((self, props) => {
    schemaProto.type.call(self, 'null', props);
  }),

  boolean: fluentize((self, props) => {
    schemaProto.type.call(self, 'boolean', props);
  }),

  object: fluentize((self, props) => {
    schemaProto.type.call(self, 'object', props);
  }),

  array: fluentize((self, props) => {
    schemaProto.type.call(self, 'array', props);
  }),

  string: fluentize((self, props) => {
    schemaProto.type.call(self, 'string', props);
  }),

  // Some Shortcuts

  int64: fluentize((self, props) => {
    schemaProto.integer.call(self, { ...props, format: 'int64' });
  }),

  int32: fluentize((self, props) => {
    schemaProto.integer.call(self, { ...props, format: 'int32' });
  }),

  requiredProp: fluentize((self, name, schema) => {
    if (! Array.isArray(self.required)) {
      self.required = [];
    }

    // TODO: Check if name is unique?
    self.required.push(name);

    if (self.properties === schemaProto.properties) {
      self.properties = {};
    }

    self.properties[name] = schema;
  }),

  items: fluentize((self, itemSchemaOrTuple) => {
    schemaProto.array.call(self, {
      items: itemSchemaOrTuple,
    });
  }),

  email: fluentize((self, props) => {
    schemaProto.string.call(self, {
      ...props,
      format: 'email',
    });
  }),

  pattern: fluentize((self, pattern, props) => {
    schemaProto.string.call(self, {
      ...props,
      pattern,
    });
  }),
});

function schema(base) {
  const inst = Object.create(schemaProto);
  if (base) {
    Object.assign(inst, JSON.parse(JSON.stringify(base)));
  }
  return inst;
}

module.exports = schema;
