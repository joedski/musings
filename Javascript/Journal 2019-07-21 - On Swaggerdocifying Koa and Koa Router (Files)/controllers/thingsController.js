// Same caveat as in usersController: this is just example data.

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


exports.getThings = getThings;
function getThings(ctx) {
  ctx.body = {
    things,
  };
}

exports.getThingById = getThingById;
function getThingById(ctx) {
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
}

exports.postNewThing = postNewThing;
function postNewThing(ctx) {
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
}
