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
                path: "/src/models/{0#|pascalcase}Record.interface.ts"
                identifier: "{0#|pascalcase}Record"
            accessMethods:
                organization: by-entry
                path: "/src/models/{0#|camelcase}Record.model.ts"
    jsonschema:
        idTemplate:
            $base: "https://example.com/schemas"
            table: "{$base}/models/{0#}"

entries:
    backend_servers:
        type: table
        comment: >-
            Servers setup in the vm management backend.
        fields:
            id:
                type: increments
                new: false
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
/**
 * Servers setup in the vm management backend.
 */
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

/**
 * Interface for sending a new BackendServersRecord.
 *
 * @see BackendServersRecord
 */
export type NewBackendServersRecord = Omit<BackendServersRecord, 'id'>;
```

And a JSON Schema like this:

```json
{
    "$id": "https://inverted-vps.thebest/schemas/models/backend_servers_record",
    "type": "object",
    "required": ["id", "name", "hardware_attributes", "is_available", "stats", "type", "datacenter_id"],
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

... with of course another one for the separate new entity.

And an initial knex up-migration like this:

```js
exports.meta = {
    created: "2019-08-11T21:53:26",
};

exports.up = (knex, Promise) => (Promise.resolve())
.then(() => knex.schema.createTable('backend_servers', table => {
    table.comment('Servers setup in the vm management backend.');

    table.increments('id');
    table.string('name', 20).notNullable();
    table.json('hardware_attributes').comment('These will definitely vary over time,\nand most likely from datacenter to datacenter.');
    table.boolean('is_available').defaultTo(false);
    table.json('stats');
    table.string('type', 10).notNullable();
    table.integer('datacenter_id').unsigned().notNullable();

    table.foreign('datacenter_id').references('datacenters.id').onDelete('CASCADE');
}))
;
```

Of course, the real question is how to handle model changes.

Cases:

- Adding Tables is already demonstrated.
- Dropping a Table is easy.
- Altering a Table is where things get dicey, mostly because Columns are the real meat of the matter.  Those and FK constraints.
    - Add a new Column.
    - Drop an existing Column.
    - Alter a Column. (may result in errors/extra config, depending on the alteration.)
    - Add a FK constraint.
    - Drop a FK constraint.

Maybe I should try trawling through SQLAlchemy?  They already have the migration-code-gen thing going on.  Which reminds me, I didn't actually try doing a class-based thing, in which case the model classes themselves would drive the codegen of the other pieces.


### Maybe With Classes Instead of Config?

There's two ways I can think of to use Classes: Decorators and Parametrization.  There are other options, but I'm not really feeling them, and Decorators don't have a settled spec yet so I don't feel like using them.  TS itself is already a transpilation step.

That leaves Parametrization.

The basic most thing is the Record Fields, and we can do that by using a Base-Class Factory, kinda like this:

```typescript
function Foo<T extends object>(recordDesc: T) {
    return class FooBase {
        recordDesc: T = recordDesc;

        getClone(): T {
            return Object.assign({}, this.recordDesc);
        }
    }
}

class FooFoo extends Foo({ foo: true, bar: 5 }) {
    getCloneWith6() {
        const clone = this.getClone();
        clone.bar = 6;
        return clone;
    }
}
```

In our case, usage would probably look something like

```typescript
class BackendServersModel extends BaseModel({
    fields: {
        id: ModelField.increments();
        node: ModelField.string(20).notNullable();
        hardware_attributes: ModelField.json()
            .comment("These will definitely vary over time,\nand most likely from datacenter to datacenter.");
        is_available: ModelField.boolean().default(false);
        stats: ModelField.json();
        type: ModelField.string(10);
        datacenter_id: ModelField.uint().notNullable().references(() => DatacentersModel, 'id');
    }
}) {
    // any specific model methods here.
}
```

This has some niceties to it:

- The models are in TS, which is one less thing to worry about.
    - This obviates a number of things, like a whole lot of codegen configuration, where to place overrides, how to handle base classes, etc.
    - Record types will probably just be generated using a simple mapped type: `RecordType<TFields> = { [K in keyof TFields]: TFields extends ModelField<infer TSType> ? TSType : never; }`
        - While this doesn't give us record-field documentation, it does at least give us a clean type.
- The JSONSchema can be generated on the fly, because we really only need it for validation and OpenAPI doc generation.
- While this doesn't eliminate codegen, it does mean we only have 1 thing to codegen: The migrations.

I don't intend to automatically fetching FK references, in part because that'd required adding an extra field since TS doesn't do property-name manipulation, and in part because I've just never cared for that.  Maybe I don't do enough middleware servers?
