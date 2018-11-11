Dgraph-JS
=========

There are certainly better choices in life that could've been made, but it's all led to this, so I might as well own up to it and use the [official Node client for Dgraph](https://www.npmjs.com/package/dgraph-js).  (although, not having to manually set up an event loop every time I want non-blocking requests is nice.  Of course, that event loop is always there even when it's not needed...)

Inane rambling aside, JS is what I have at hand and what I shall use to prototype this thing I'm using Dgraph for, so I need to figure out at least the most basic usage patterns so I can spend more time doing.



## Major Operations

A lot of this is based on the [simple example](https://github.com/dgraph-io/dgraph-js/tree/v1.2.1/examples/simple) in the Dgraph-JS repo.  I'm looking at [dgraph-js v1.2.1](https://github.com/dgraph-io/dgraph-js/tree/v1.2.1)


### Client Initialization

This is one of the main interfaces Dgraph-JS provides, so it'd be a bit silly not knowing how to use it.  Looks like it's something like this:

```js
const dgraph = require('dgraph-js')
const grpc = require('grpc')

const clientStub = new dgraph.DgraphClientStub(DGRAPH_URI, grpc.credentials.createInsecure())
const client = new dgraph.DgraphClient(clientStub)
```

Of course, if developing locally, you don't even need to specify the additional arguments to the `DgraphClientStub` constructor, the default values are `http://localhost:9080` and `grpc.credentials.createInsecure()`, making the client creation a bit more succinct:

```js
const localDevClient = new dgraph.DgraphClient(new dgraph.DgraphClientStub())
```

As noted [right in their readme](https://github.com/dgraph-io/dgraph-js/tree/v1.2.1#debug-mode), debug mode for additional logging noise is easy:

```js
client.setDebugMode(true) // or just client.setDebugMode()
```


### Schema Creation

To start, I need to be able to create schemas, if for no other reason than to have documentation about what edges are being used for a given model.

Schema alteration seems to be done with a `dgraph.Operation`, which of course is then passed to `DgraphClient#alter()`:

```js
async function setSomeSchema(client) {
  const op = new dgraph.Operation()
  op.set(SOME_SCHEMA)
  await client.alter(op)
}
```


### Data Insertion

I think one thing to state right off the bat is that the only difference between an insert and an update in Dgraph is whether or not a `uid` is specified.  With RDF triples, this means specifying the UID of the node to mutate as the object of a statement.  With JSON, it means specifying a `uid` prop on your node object.  While in RDF, you use `_:some_arbitrary_temp_name` to specify a new node (with `some_arbitrary_temp_name` used to reference this new node in this particular mutation) in JSON, you just don't specify a `uid` prop.

Anyway, since [the example code I'm looking at](https://github.com/dgraph-io/dgraph-js/tree/v1.2.1/examples/simple) uses JSON, I'll just look at that here and maybe look up RDF input later.

Here's an insertion:

```js
// First we need a transaction:
async function insertPerson(client, person) {
  const txn = client.newTxn()
  try {
    // NOTE: Mutation, as opposed to Operation.  Eh, there you go I guess.
    const mut = new dgraph.Mutation()
    mut.setSetJson(person)

    // Get the node assignments...
    const assigned = await txn.mutate(mut)

    // ... and commit the transaction.
    await txn.commit()

    // Once things are committed, we know the assignments are accurate.
    // We can do things like get all the new nodes' UIDs:
    // NOTE: When using the JSON interface, new nodes are created with the tags
    //   blank-0, blank-1, blank-2, ... blank-n
    const newPersonNodeUid = assigned.getUidsMap().get('blank-0')
    assigned.getUidsMap().forEach((key, uid) => console.log(`_:${key} => ${uid}`))
    return {
      uid: newPersonNodeUid,
    }
  }
  finally {
    // If commit() succeeded, then discard() is a noop.
    // Otherwise, it's wise to discard when an error occurs.
    txn.discard()
  }
}
```

As noted in their section on [Committing a transaction](https://github.com/dgraph-io/dgraph-js/tree/v1.2.1#commit-a-transaction), if you try to mutate something and someone else wins, your transact will throw an error.  It's up to you to decide what to do about that, wether to retry or fail.


### Queries

Queries are probably the easiest to understand, at least until you get to functions and filtering...  Basic queries are very simple, though:

```js
async function queryPersonByName(client, name) {
  const query = `query people($name: string) {
    people(func: eq(name, $name)) {
      uid
      name
    }
  }`
  const vars = { $name: name }
  const res = await client.newTxn().queryWithVars(query, vars)
  // Data!
  console.log(res.data)
  // There's also some fluff about the query itself.
  console.log(res.extensions)
}
```

Obviously, if you don't need vars, then you can just use `Transaction#query(query)` instead of `#queryWithVars(query, vars)`.
