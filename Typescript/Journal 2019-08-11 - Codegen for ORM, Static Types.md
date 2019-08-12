Journal 2019-08-11 - Codegen for ORM, Static Types
========

I was playing around [deriving an object interface from a JSON Schema literal type](./Journal%202019-08-10%20-%20Simple%20Schema%20Builder%20with%20TypeScript%20Types.md) which turned out to be, 1 case aside, fairly straight forward for at least those parts I wanted to cover.

However, some issues:

- Because it's a bunch of mapped and conditional types, it means every type derived from a schema is another thing the TS server has to keep track of.
- Those type look _ugly_.

There are places where I already want to engage in codegen, mostly for client-side libraries based on OpenAPI docs, but I figured maybe I should also consider applying this same thought process to a DB interface.

- I'm going to be dealing with an RDBMS, specifically Postgres, but with an attempt made at keeping it agnostic.
    - Principly, this methodology could be applied to anyone, but I'm starting with what I know, and I get the feeling that there'll be a fair number of backend-specific things even just dealing with Postgres-vs-other-RDBMSs.
- I'm going to stick to Knex as an output to help keep things at least somewhat sql-backend agnostic.

That now said, I want to look at my general goals:

- Generate TS Types/Interfaces
- Generate JSON Schemas (for OpenAPI support)
- Generate Migrations

Of these, the Migrations story is the most fiddly.  The others don't involve any diffing.



## Config File

The Config File itself will probably be in YAML just so that any custom queries can be written using multi-line stuff.

```yaml
backend: postgres

targets:
    knex:
        migrations: "/migrations"
        knexfile: "/knexfile.js"
    typescript:
        destinations:
            # this is just an example, I'm not actually sure what all might go in here, and honestly I'm going to hard code it to start, anyway.
            # Also not sure what to use for references.  At first I started with "entry.key" but then I want to use JSON pointers prevasively, and "0#" is the same thing, but not made up.
            interfaces:
                organization: by-entry
                path: "/src/models/{0#|pascalcase}.interface.ts"
                identifier: "{0#|pascalcase}"
            accessMethods:
                organization: by-entry
                path: "/src/models/{0#|camelcase}.model.ts"
    jsonschema:
        idTemplate:
            $base: "https://example.com/schemas"
            table: "{$base}/models/{0#}"

entries:
    backend_servers:
        type: table
        fields:
            id: increments
            node:
                type: string
                size: 20
                notNull: true
            hardware_attributes:
                type: json
                # optional: `schema` for a JSON Schema.
                comment: >-
                    These will definitely vary over time,
                    and most likely from datacenter to datacenter.
            is_available:
                type: boolean
                default: false
            stats:
                type: json
            type:
                type: string
                size: 10
                notNull: true
            datacenter_id:
                type: unsigned integer
                notNull: true
                references: datacenters.id
                # not actually in the original I based this on, just used here an as example.
                onDelete: cascade
```

Should result in an interface like this:

```typescript
export default interface BackendServersRecord {
    id: number;
    node: string;
    /**
     * These will definitely vary over time,
     * and most likely from datacenter to datacenter.
     */
    // No schema means we get `object`.  Boo.
    hardware_attributes: object | null;
    is_available: boolean;
    // No schema means we get `object`.  Boo.
    stats: object;
    type: string;
    /**
     * @see DatacentersRecord.id
     */
    datacenter_id: number;
}
```

And a JSON Schema like this:

```json
{
    "$id": "https://inverted-vps.thebest/schemas/models/backend_servers",
    "type": "object",
    "required": [],
    "properties": {
        "id": {
            "type": "integer",
            "minimum": 0
        },
        "name": {
            "type": "string",
            "maxLength": 20
        },
        "hardware_attributes": {
            "comment": "description is the correct field for this, since we want it to appear elsewhere.  the comment field is meant to be ignored.",
            "description": "These will definitely vary over time,\nand most likely from datacenter to datacenter.",
            "oneOf": [
                {
                    "type": "null"
                },
                {
                    "type": "object"
                }
            ]
        },
        "is_available": {
            "type": "boolean"
        },
        "stats": {
            "oneOf": [
                {
                    "type": "null"
                },
                {
                    "type": "object"
                }
            ]
        },
        "type": {
            "type": "string",
            "maxLength": 10
        },
        "datacenter_id": {
            "type": "integer",
            "minimum": 0
        }
    }
}
```

And an initial knex up-migration like this:

```js
exports.meta = {
    created: "2019-08-11T21:53:26",
};

exports.up = (knex, Promise) => (Promise.resolve())
.then(() => knex.schema.createTable('backend_servers', table => {
    table.increments('id');
    table.string('name', 20).notNullable();
    table.json('hardware_attributes');
    table.boolean('is_available').defaultTo(false);
    table.json('stats');
    table.string('type', 10).notNullable();
    table.integer('datacenter_id').unsigned().notNullable();

    table.foreign('datacenter_id').references('datacenters.id').onDelete('CASCADE');
}))
;
```
