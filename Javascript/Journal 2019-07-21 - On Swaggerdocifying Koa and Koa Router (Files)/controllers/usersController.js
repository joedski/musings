// Obviously in a real application, the controller of a RESTish thingy
// wouldn't be stateful like this.  This data is purely for example.
// In a real application, actual state interaction would be done though
// models, possibly services if things grow that complex.

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

exports.getUsers = getUsers;
function getUsers(ctx) {
  ctx.body = {
    users,
  };
}

exports.postNewUser = postNewUser;
function postNewUser(ctx) {
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
}

exports.getUserById = getUserById;
function getUserById(ctx) {
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
}
