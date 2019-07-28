const Router = require('koa-router');
const BodyParser = require('koa-bodyparser');

const users = [
  {
    id: 194,
    name: 'Slartibartfast',
  },
  {
    id: 80953,
    name: 'Rumplestiltskin',
  },
  {
    id: 233895,
    name: 'Fart',
  },
];

let usersSerialId = users.reduce((acc, it) => (it.id > acc ? it.id : acc), -1) + 1;

const things = [
  {
    id: 209353290,
    name: 'A Thing',
    description: "It's very thingy",
  },
  {
    id: 23994,
    name: 'Foobar',
    description: "Pretty sure this is beyond repair",
  },
  {
    id: 5849,
    name: 'Wolf',
    description: "How did this wolf get in here?",
  },
];

let thingsSerialId = things.reduce((acc, it) => (it.id > acc ? it.id : acc), -1) + 1;


const rootRouter = new Router({ prefix: '/v1' });

rootRouter.get('/', (ctx) => {
  ctx.body = {
    version: '0.0.0',
  };
});

rootRouter.get('/users', Object.assign((ctx) => {
  ctx.body = {
    users,
  };
}, {
  apiDoc: {
    summary: "Gets a list of users you're allowed to see.",
    parameters: [],
    responses: {
      '200': {
        description: "A list of Users",
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'name'],
                properties: {
                  id: { type: 'integer', format: 'int64' },
                  name: { type: 'string' }
                },
              },
            },
          },
        },
      },
    },
  },
}));

rootRouter.post('/users', BodyParser(), (ctx) => {
  if (! ctx.request.body || typeof ctx.request.body !== 'object') {
    ctx.status = 400;
    return;
  }

  const newUser = {
    ...ctx.request.body,
    id: usersSerialId,
  };

  usersSerialId += 1;

  users.push(newUser);

  ctx.body = newUser;
});

rootRouter.get('/users/:userId', (ctx) => {
  const userId = Number(ctx.params.userId);

  if (! Number.isFinite(userId)) {
    ctx.status = 400;
    return;
  }

  const user = users.find(it => it.id === userId);

  if (! user) {
    ctx.status = 404;
    return;
  }

  ctx.body = user;
});


const thingsRouter = new Router();

thingsRouter.get('/', (ctx) => {
  ctx.body = {
    things,
  };
});

thingsRouter.get('/:thingId', Object.assign((ctx) => {
  const thingId = Number(ctx.params.thingId);

  if (! Number.isFinite(thingId)) {
    ctx.status = 400;
    return;
  }

  const thing = things.find(it => it.id === thingId);

  if (! thing) {
    ctx.status = 404;
    return;
  }

  ctx.body = thing;
}, {
  apiDoc: {
    summary: "Get a Thing by ID.",
    parameters: [
      {
        name: 'thingId',
        in: 'path',
        required: true, // can be based on layer.params(.name).required
        description: "ID of the Thing you want.",
        schema: {
          type: 'integer',
          format: 'int64',
          minimum: 1,
        },
      },
    ],
    responses: {
      '200': {
        description: "A Thing",
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['id', 'name'],
              properties: {
                id: { type: 'integer', format: 'int64' },
                name: { type: 'string' }
              },
            },
          },
        },
      },
    },
  },
}));

thingsRouter.post('/', BodyParser(), (ctx) => {
  if (! ctx.request.body || typeof ctx.request.body !== 'object') {
    ctx.status = 400;
    return;
  }

  const newThing = {
    ...ctx.request.body,
    id: thingsSerialId,
  };

  thingsSerialId += 1;

  things.push(newThing);

  ctx.body = newThing;
});


rootRouter.use('/things', thingsRouter.routes(), thingsRouter.allowedMethods());


// Not exposing thingsRouter directly.
// We should be able to find the routes by traversal.
module.exports = rootRouter;
