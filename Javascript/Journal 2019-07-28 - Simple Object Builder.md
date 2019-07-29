Journal 2019-07-28 - Simple Object Builder
========

I was thinking about how to create an object builder with a fluent-style interface.

I came up with something like this as a first sketch:

```js
function fluentize(method) {
  const name = method.name || 'fn';
  // Hack around not being able to easily set arbitrary names.
  return {
    [name](...args) {
      // Create a new object if a method is called directly from schemasProto.
      const self =
        this === schemasProto
          ? Object.create(schemasProto)
          : this;

      const result = method(self, ...args);
      if (result === undefined) return self;
      return result;
    },
  }[name];
}

const schemaProto = {
  // Amusingly, no need for toJSON(): these are all on the prototype,
  // and so are not serialized.

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
    self.type('integer', props);
  }),

  number: fluentize((self, props) => {
    self.type('number', props);
  }),

  // ...etc.

  // Some more complex ones.

  int64: fluentize((self, props) => {
    self.integer({ ...props, format: 'int64' });
  }),

  requiredProp: fluentize((self, name, schema) => {
    if (! Array.isArray(self.required)) {
      self.required = [];
    }

    // TODO: Check if name is unique?
    self.required.push(name);

    if (self.properties === schemasProto.properties) {
      self.properties = {};
    }

    self.properties[name] = schema;
  }),
};

function schema(base) {
  const inst = Object.create(schemasProto);
  if (base) {
    Object.assign(inst, JSON.parse(JSON.stringify(base)));
  }
  return inst;
}
```

Which could be used like so:

```js
const int64 = schema().int64({ minimum: 1 });
console.log(int64);
// -> { type: 'number', format: 'int64', <Prototype>: ... }

const obj = schema().object()
    .requiredProp('foo', schema().email())
    .requiredProp('bar', schema().boolean())
    ;
console.log(obj);
// -> { type: 'object', required: ['foo', 'bar'], properties: { foo: ... }, ... }
```

Obviously, there's the consideration that some methods will be overshadowed by instance property values, but the nice thing is that once that happens, you don't really need to touch them again.

Hm.  Do I need to actually call `schema()` every time?  Well, yes, since `name` is a common enough property name that there's very likely to be conflict there.  It's very read-only on Functions.

Of course, I could just not export a function at all, and just export the proto.

```js
const obj = schema.object()
    .requiredProp('foo', schema.email())
    .requiredProp('bar', schema.boolean())
    ;
```

I think I like that a bit better.

Compare the above to:

```js
const obj = {
  type: 'object',
  required: [ 'foo', 'bar' ],
  properties: {
    foo: { format: 'email', type: 'string' },
    bar: { type: 'boolean' } } };
```

I think the most annoying part is the separation of `required` and `properties` and that's one place where the fluent interface wins big but anyway, that's not actually what it'll be used for in my current usecase.  Well, maybe.

Mostly it's to have a schema and swaggerdoc that's less annoying when formatted by prettier.
