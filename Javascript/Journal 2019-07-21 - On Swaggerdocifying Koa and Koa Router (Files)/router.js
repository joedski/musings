const Router = require('koa-router');
const BodyParser = require('koa-bodyparser');

const usersController = require('./controllers/usersController');
const thingsController = require('./controllers/thingsController');

const rootRouter = new Router({ prefix: '/v1' });

rootRouter.get('/', (ctx) => {
  ctx.body = {
    version: '0.0.0',
  };
});

rootRouter.get('/users', Object.assign(usersController.getUsers, {
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

rootRouter.post('/users', BodyParser(), usersController.postNewUser);

rootRouter.get('/users/:userId', usersController.getUserById);


const thingsRouter = new Router();

thingsRouter.get('/', thingsController.getThings);

thingsRouter.get('/:thingId', Object.assign(thingsController.getThingById, {
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

thingsRouter.post('/', BodyParser(), thingsController.postNewThing);


rootRouter.use('/things', thingsRouter.routes(), thingsRouter.allowedMethods());


// Not exposing thingsRouter directly.
// We should be able to find the routes by traversal.
module.exports = rootRouter;
