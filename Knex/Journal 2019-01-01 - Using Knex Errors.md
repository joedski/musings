Using Knex Errors
=================

What better way to inaugurate the new year than playing with errors!

I have a model setup like this:
- Entity: id
- Page: id -> FK:Entity.id

I don't want to do any more logic than I need to, but I still want to generate a 404 if the Entity.id isn't found.

Since there's a Foreign Key Constraint, Postgres (I'm using Postgres here) will throw an error if the Page.id being attempted here doesn't exist in Entity.id.  Specifically, it will fail with this message:

```
ERROR:  insert or update on table "page" violates foreign key constraint "page_id_foreign"
DETAIL:  Key (id)=(9000) is not present in table "entity".
```

Query to cause that:

```sql
insert into page (id, content, summary) values (9000, 'no', 'no');
```

How's Knex propagate this out?

If I log the error directly, Node formats it thusly:

```
{ error: insert or update on table "page" violates foreign key constraint "page_id_foreign"
    at Connection.parseE (.../node_modules/pg/lib/connection.js:554:11)
    at Connection.parseMessage (.../node_modules/pg/lib/connection.js:379:19)
    at Socket.<anonymous> (.../node_modules/pg/lib/connection.js:119:22)
    at Socket.emit (events.js:182:13)
    at addChunk (_stream_readable.js:283:12)
    at readableAddChunk (_stream_readable.js:264:11)
    at Socket.Readable.push (_stream_readable.js:219:10)
    at TCP.onStreamRead [as onread] (internal/stream_base_commons.js:94:17)
  name: 'error',
  length: 236,
  severity: 'ERROR',
  code: '23503',
  detail: 'Key (id)=(9999999) is not present in table "entity".',
  hint: undefined,
  position: undefined,
  internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: 'public',
  table: 'page',
  column: undefined,
  dataType: undefined,
  constraint: 'page_id_foreign',
  file: 'ri_triggers.c',
  line: '2851',
  routine: 'ri_ReportViolation' }
```

Request to cause that:

```sh
curl -X PUT localhost:8000/api/pages/9999999 -d '{"content":"no","summary":"no"}'
```

I think the only thing I need to look for in this case is `insert or update on table "page" violates foreign key constraint "..."`.  I'm not actually sure what the FK constraint will be called since that's created by Knex automatically, though through a prescribed method.  But, hopefully the Postgres error message itself won't change quickly.  I'll just do `violates foreign key constraint` since that's pretty clear, intent wise.

Okay, so, something like this should do:

```js
function doTheThing(trx, ...) {
    await trx.whatever(...)
    .then(
        () => {},
        error => {
            if (error.message.includes('violates foreign key constraint')) {
                error.appError = 'entity.not_found'
            }

            throw error
        }
    )
}
```

I'm going to use the `appError` property to define more meaningful error codes.  I just decided that right now.  I'm so clever.  I'm using a meaningful string because the Model layer doesn't care that it's being run in an HTTP server.

Then, my router does this: (I'm using Koa and Koa Router)

```js
async function routeHandler(ctx) {
    // ... stuff!

    try {
        ctx.body = await PageController.updatePage(pageId, payload)
    }
    catch (error) {
        switch (error.appError) {
            case 'entity.not_found': ctx.throw(404)
            default: throw error
        }
    }
}
```

Good enough to start, but I'll definitely need to do some sort of automatic mapping later.
