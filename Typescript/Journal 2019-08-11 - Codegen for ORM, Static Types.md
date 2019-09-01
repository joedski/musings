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
- Methods are added in the Subclass, which already has a defined Record shape thanks to extending the base class, and thus gives you easy access to derived types like `RecordType<TModelClass>` and `NewRecordType<TModelClass>`.
    - These can be exported so you don't have to constantly faff with `NewRecordType<typeof ThisModel>` all the time.

I don't intend to automatically fetching FK references, in part because that'd required adding an extra field since TS doesn't do property-name manipulation, and in part because I've just never cared for that.  Maybe I don't do enough middleware servers?

> Why not just subclass directly and stick the value on the field?  Because a Class's Type Parameters must be specified, whether by supplying a value or specifying a default.  The result of that is that, in the proposed use case above, the type and the value fitting that type must be both specified separately, or else the value from which the type is derived must be specified separately from the subclass.  Using a Function allows a value to specify the type, thus covering both in the base class.

This technique is pretty solid looking, and keep magic to a minimum.  The only minor boilerplate is that you need to actually instantiate it when exporting.

So, at minimum, your model declaration looks like this:

```typescript
import BaseModel from './BaseModel';

const ThisModel = BaseModel({
    fields: {
        // ...
    },
});

export default new ThisModel();
```

or like this:

```typescript
import BaseModel from './BaseModel';

class ThisModel extends BaseModel({
    fields: {
        // ...
    },
}) {
    // no overrides... yet!
};

export default new ThisModel();
```

The latter is more uniform since you don't have to change how you write things when you actually do need to add extra methods.

As noted above, you can export the Record types to make the rest of the program more readable, too, and will probably want to just as a matter of course.

```typescript
import { BaseModel, RecordType, NewRecordType } from './Model';

class ThisModel extends BaseModel({
    fields: {
        // ...
    },
}) {
    // no overrides... yet!
};

export default new ThisModel();

export type ThisRecord = RecordType<ThisModel>;
export type NewThisRecord = NewRecordType<ThisModel>;
```

Not the greatest boilerplate, but not the worst.  Certainly templatizable.


### Other Thoughts

SQLAlchemy aims to provide a lot of, I guess not really abstractions per se, but affordances in mapping Object Land to Table Land, tools for you to build the abstractions you want.  (I mean, it's right in the description: "SQLAlchemy is a database toolkit and object-relational mapping (ORM) system for Python...")

> A good read on the full architecture of SQLAlchemy appears in [the Architecture of Open Source Applications](https://aosabook.org/en/sqlalchemy.html).  Highly recommend reading through it, even if you can't understand everything yet.

I'm not aiming as much to do that, though maybe some things will accidentally cross over that way.  I really just want things to stick pretty close to SQL, mostly by way of Knex's query building.  Whether that allows some amount of composability (and it may very well do so since Knex has a number of things such as `whereIn()` that accept a separate query) isn't as much at the forefront as just having what amount to nicely named query-builder prefabs.

In general, my little thingy is just intended to be a convenient way to write those prefabs while also supporting fluid-and-optional use of transactions, autogen of JSONSchemas, leaving all the DB specifics to Knex.  It's not intended to serve everyone's use cases, though may accidentally be a nice way to do so?  Hm.



## On Actually Implementing Migration Codegen

All of the above is window dressing to this piece: the actual algorithm of Migration Codegen doesn't change, only what's driving it, and it's always going to be a separate reconciliation step, though certainly one that should have some sort of safety hook to stop 3AM commits from causing a model/schema desync.  Could be a githook, could be just a check on app startup that the models match the last codegen.

Cases:

- Adding Tables is already demonstrated.
- Dropping a Table is easy, though use `dropTableIfExists()` most of the time.
- Altering a Table is where things get dicey, mostly because Columns are the real meat of the matter.  Those and FK constraints.
    - Add a new Column.
    - Drop an existing Column.
    - Alter a Column. (may result in errors/extra config, depending on the alteration.)
    - Add a FK constraint.
    - Drop a FK constraint.

Some things I'll skip initially:

- Renaming Tables.
- Renaming Columns.

Maybe I should try trawling through SQLAlchemy?  They already have the migration-code-gen thing going on.

On the other hand, for my very limited use case, I'm not sure it's much of a problem.  Most of the time, the absolute most I do is either a JOIN or two, or else a WHERE IN.  Or, like, 5 nested WHERE IN clauses because of a hierarchical model.  (hello, arbitrarily nested pages in chronoforms in joomla...)


### Altering a Table

In Knex land, this is simply done by calling `knex.schema.table(tableName, fn)`.  Optionally, you can preface that with `withSchema`: `knex.schema.withSchema(schemaName).table(...)`.  That's easy.

What's less easy is the Columns malarkey.  Adding and Dropping Columns is easy enough, so there's not much to get into there.

Altering columns could be tricky, but fortunately we don't have to worry about getting too hairy in the diffs: When SQL alters a column, the new specification overwrites the previous one, so all we have to do is just mark any alteration with `.alter()`.  This means changing the constraints is also really easy: just don't mention ones you're dropping, only the ones you're adding.  Nice.

Adding an FK constraint is easy enough, and so is dropping one: Since Knex uses a predictable algorithm for generating the FK key from the given column names, you can drop a previous FK constraint by just listing the same columns in the same order.  Nice.


### Extracting a Diff

In order to extract a diff, we first need a description of the table that we can compare to another one.

I'm not going to bother doing anything fancy, an object will do just fine.  Note that since these are meant to ultimately generate knex statements, they're organized along such lines rather than in any other way.  That also tends to somewhat closely follow how SQL table statements themselves are organized, so that's nice.

Really, about the only thing that seems remotely odd to me is sticking `unsigned` in the column description rather than a type.  But, eh.

```typescript
interface TableDescription {
    name: string;
    comment: string;
    columns: Array<ColumnDescription>;
    foreignKeyConstraints: Array<ForeignKeyConstraintDescription>;
    indices: Array<IndexDescription>;
}

interface ColumnDescription {
    name: string;
    type: ColumnType;
    unsigned: boolean;
    comment: string | null;
    notNullable: boolean;
    default: string;
    primary: boolean;
    unique: boolean;
}

interface ForeignKeyConstraintDescription {
    columnNames: Array<string>;
    foreignTableName: string;
    foreignColumnNames: Array<string>;
}

interface IndexDescription {
    columnNames: Array<string>;
    indexName: string | null;
    indexType: string | null;
}

/**
 * If you're familiar with knex, you might notice that these are
 * basically a knex column creator with the non-column-name args.
 * This is intentional.
 */
type ColumnType =
    | ['integer']
    | ['bigInteger']
    /**
     * there's an optional 'medium' | 'big' that could go after,
     * but that's for mysql only, and I'm using postgres.
     */
    | ['text']
    | ['string', number]
    | ['float', number | null, number | null]
    | ['decimal', number | null, number | null]
    | ['boolean']
    | ['date']
    | ['datetime', { useTz?: boolean; precision?: number }]
    | ['time', number | null]
    | ['timestamp', { useTz?: boolean; precision?: number }]
    | ['binary']
    | ['enum', Array<string | number> | null, { useNative?: boolean; enumName?: string }]
    | ['json']
    | ['jsonb']
    | ['uuid']
    ;
```

From there, it's pretty simple, or at least as simple as any object-diff algo:

- For each Table in the previous modelset, add a Deletion for it.
- For each Table in the next modelset:
    - If it is marked for Deletion, change that mark to Alteration.
    - If it is not marked, add an Addition for it.
- For each Table marked for Alteration:
    - Collect the Primary Columns' Names in the previous version of this Table and the next version of this Table:
        - If the Primary Column Names in both versions are set-wise equal, pass.
        - If they differ, then:
            - Drop the previous primary key. (only ever use the default pkey name)
            - Add a new Primary Key Constraint with the given Column Names if the number of Names is 1 or more.
                - During actual rendering, if there's only 1 name it's left to column creation.  If there's 2 or more, then it's created as a separate step.
    - For each Column in the previous version of this Table, add a Deletion for it.
    - For each Column in the next version of this Table:
        - If it is marked for Deletion, change that mark to Alteration.
        - If it is not marked, add an Addition for it.
    - For each FK Constraint in the previous version of this Table, add a Deletion for it.
    - For each FK Constraint in the next version of this Table:
        - If it is marked for Deletion, remove that Deletion.
        - If it is not marked, add an Addition for it.
    - For each Index in the previous version of this Table, add a Deletion for it.
    - For each Index in the next version of this Table:
        - If it is marked for Deletion, remove that Deletion.
        - If it is not marked, add an Addition for it.

The only real thing of note is that Tables and Columns can be altered, while FK Constraints and Indices can only be added or dropped.

This gives us this:

```typescript
type TableDiffOperation =
    | { op: 'create', table: TableDescription }
    | { op: 'drop', table: TableDescription }
    | {
        op: 'alter';
        prevTable: TableDescription;
        nextTable: TableDescription;
        columnOperations: Array<ColumnDiffOperation>;
        primaryKeyConstraintOperations: Array<PrimaryKeyConstraintDiffOperation>;
        foreignKeyConstraintOperation: Array<ForeignKeyConstraintDiffOperation>;
    }
    ;

type PrimaryKeyConstraintDiffOperation =
    | { op: 'create', columns: Array<ColumnDescription> }
    | { op: 'drop', columns: Array<ColumnDescription> }
    ;

type ColumnDiffOperation =
    | { op: 'create', column: ColumnDescription }
    | { op: 'drop', column: ColumnDescription }
    | { op: 'alter', prev: ColumnDescription, next: ColumnDescription }
    ;

type ForeignKeyConstraintDiffOperation =
    | { op: 'create', constraint: ForeignKeyConstraintDescription }
    | { op: 'drop', constraint: ForeignKeyConstraintDescription }
    ;

type IndexDiffOperation =
    | { op: 'create', index: IndexDescription }
    | { op: 'drop', index: IndexDescription }
    ;
```

The above algorithm is for generating an Up Migration, of course.  To produce a Down Migration, just flip the Tables.



## Brass Tacks and Such

Implementation of the various parts went basically as expected, and I even got types on the basic-most query builder methods that return Query Builders with good type parametrization!

One small issue I'm running into now that I'm two commits into: I broke `ModelField#references()`:

```
Type '$BarModel' is not assignable to type 'BaseModel<Record<string, ModelField<any, boolean, boolean>>>'.
  Types of property 'findWhere' are incompatible.
    Type '{ (where: WhereCondition<{ id: ModelField<number, false, true>; name: ModelField<string, true, true>; }>): QueryBuilder<RecordTypeOfFields<{ id: ModelField<number, false, true>; name: ModelField<string, true, true>; }>, RecordTypeOfFields<...>[]>; <TSelect extends AnyArray<...>>(where: WhereCondition<...>, select: T...' is not assignable to type '{ (where: WhereCondition<Record<string, ModelField<any, boolean, boolean>>>): QueryBuilder<RecordTypeOfFields<Record<string, ModelField<any, boolean, boolean>>>, RecordTypeOfFields<Record<string, ModelField<...>>>[]>; <TSelect extends string[] | readonly string[]>(where: WhereCondition<...>, select: TSelect): QueryB...'.
      Type 'QueryBuilder<RecordTypeOfFields<{ id: ModelField<number, false, true>; name: ModelField<string, true, true>; }>, RecordTypeOfFields<{ id: ModelField<number, false, true>; name: ModelField<string, true, true>; }>[]>' is not assignable to type 'QueryBuilder<RecordTypeOfFields<Record<string, ModelField<any, boolean, boolean>>>, RecordTypeOfFields<Record<string, ModelField<any, boolean, boolean>>>[]>'.
        Types of property 'whereIn' are incompatible.
          Type 'WhereIn<RecordTypeOfFields<{ id: ModelField<number, false, true>; name: ModelField<string, true, true>; }>, RecordTypeOfFields<{ id: ModelField<number, false, true>; name: ModelField<string, true, true>; }>[]>' is not assignable to type 'WhereIn<RecordTypeOfFields<Record<string, ModelField<any, boolean, boolean>>>, RecordTypeOfFields<Record<string, ModelField<any, boolean, boolean>>>[]>'.
            Types of parameters 'values' and 'values' are incompatible.
              Type 'QueryBuilder<any, any>' is not assignable to type 'any[] | QueryCallback<any, unknown[]>'.
                Type 'QueryBuilder<any, any>' is missing the following properties from type 'any[]': length, pop, push, concat, and 27 more.
```

- So, it says that...
    - This `$BarModel#findWhere()` is not assignable to
    - That `BaseModel<Record<string, AnyModelField>>#findWhere()`
- Drilling down through that, it says
    - This `QueryBuilder<RecordTypeOfFields<{...}>, RecordTypeOfFields<{...}>[]>` is not assignable to
    - That `QueryBilder<RecordTypeOfFields<Record<string, AnyModelField>>, RecordTypeOfFields<Record<string, AnyModelField>>[]>`
- From there, it says `.whereIn` is incompatible, saying `WhereIn<...{...}..., ...[]>` is not assignable to `WhereIn<...Record..., ...[]>`
- By dint of `WhereIn<>(..., values)` being incompatible because, to quote:
    - `Type 'QueryBuilder<any, any>' is not assignable to type 'any[] | QueryCallback<any, unknown[]>'`
    - Which is, yep, incompatible.  Okay, where's that showing up?

```typescript
namespace Knex {
  // ...

  interface WhereIn<TRecord = any, TResult = unknown[]> {
    <K extends keyof TRecord>(
      columnName: K,
      values: TRecord[K][] | QueryCallback
    ): QueryBuilder<TRecord, TResult>;
    (columnName: string, values: Value[] | QueryCallback): QueryBuilder<
      TRecord,
      TResult
    >;
    <K extends keyof TRecord>(
      columnNames: K[],
      values: TRecord[K][][] | QueryCallback
    ): QueryBuilder<TRecord, TResult>;
    (columnNames: string[], values: Value[][] | QueryCallback): QueryBuilder<
      TRecord,
      TResult
    >;
    <K extends keyof TRecord, TRecordInner, TResultInner>(
      columnName: K,
      values: QueryBuilder<TRecordInner, TRecord[K]>
    ): QueryBuilder<TRecord, TResult>;
    <TRecordInner, TResultInner>(
      columnName: string,
      values: QueryBuilder<TRecordInner, TResultInner>
    ): QueryBuilder<TRecord, TResult>;
    <K extends keyof TRecord, TRecordInner, TResultInner>(
      columnNames: K[],
      values: QueryBuilder<TRecordInner, TRecord[K]>
    ): QueryBuilder<TRecord, TResult>;
    <TRecordInner, TResultInner>(
      columnNames: string[],
      values: QueryBuilder<TRecordInner, TResultInner>
    ): QueryBuilder<TRecord, TResult>;
  }

  // ...
}
```

That's a bit hideous to read.  Mmmm, autoformatting.  Let's unify those formattings to make things a bit easier to read.

```
namespace Knex {
  // ...

  interface WhereIn<TRecord = any, TResult = unknown[]> {
    <
      K extends keyof TRecord
    >(
      columnName: K,
      values: TRecord[K][] | QueryCallback
    ): QueryBuilder<TRecord, TResult>;

    (
      columnName: string,
      values: Value[] | QueryCallback
    ): QueryBuilder<TRecord, TResult>;

    <K extends keyof TRecord>(
      columnNames: K[],
      values: TRecord[K][][] | QueryCallback
    ): QueryBuilder<TRecord, TResult>;

    (
      columnNames: string[],
      values: Value[][] | QueryCallback
    ): QueryBuilder<TRecord, TResult>;

    <
      K extends keyof TRecord,
      TRecordInner,
      TResultInner
    >(
      columnName: K,
      values: QueryBuilder<TRecordInner, TRecord[K]>
    ): QueryBuilder<TRecord, TResult>;

    <
      TRecordInner,
      TResultInner
    >(
      columnName: string,
      values: QueryBuilder<TRecordInner, TResultInner>
    ): QueryBuilder<TRecord, TResult>;

    <
      K extends keyof TRecord,
      TRecordInner,
      TResultInner
    >(
      columnNames: K[],
      values: QueryBuilder<TRecordInner, TRecord[K]>
    ): QueryBuilder<TRecord, TResult>;

    <
      TRecordInner,
      TResultInner
    >(
      columnNames: string[],
      values: QueryBuilder<TRecordInner, TResultInner>
    ): QueryBuilder<TRecord, TResult>;
  }

  // ...
}
```

Seems TS is picking different overloads based on the type.  Which ones for which?

- The two incompatible types arise in the `values` parameter:
    - The first where the `values` parameter is `QueryBuilder<any, any>`
    - The second where the `values` parameter is `any[] | QueryCallback<any, unknown[]>`
- We can see that looking at the overloads that there are actually two broad swathes of overloads.
    - The first type seems to cover the last four overloads.
    - The second type seems to cover the first four overloads.

Then, what's causing that differentiation?  Well, let's try to at least narrow things down a bit:

- Order is important.  The first one is the specific type while the other is the constraint type.
    1. `$BarModel` itself extends `BaseModel<{ id: ModelField<...>; name: ModelField<...>; }`
    2. `BaseModel<Record<string, AnyModelField>>` expands to `BaseModel<{ [K: string]: AnyModelField }>`

Those two types are compatible, or at least `$BarModel` is assignable to the latter.


### Assumptions about Record

Not entirely sure why the incompatibilities are occurring, so let's examine an assumption: that `Record<K, T>` is the same as `{ [K: string]: T }`.

First, we'll need to see the actual type definition for `Record`.

```typescript
// lib.es5.d.ts
type Record<K extends keyof any, T> = {
    [P in K]: T;
};
```

Okay, that's a bit different, certainly more than what I'd've done.  However, with the type parameters that reifies to this:

```
type Record<string, T> = { [P in string]: T };
```

Which is pretty much what I mean, anyway, so I'm not sure that directly has an effect.  It might, or might not.  Dunno.

I do know this, though: Mapped Types, when not immediately indexed into, can be used to break a circular reference in a type alias, which means there's at least a little lazification going on.  Hm.

This suggests some things to try, though:

1. Try just using `{ [k: string]: AnyModelField }` instead of `Record<...>`.
    - `Record<...>` is technically a mapped type, while `{ [k: string]: T }` is a plain interface type.
2. Try mapping over the Field Types.
    - Admittedly, not sure if this would make any difference since `RecordTypeOfFields<T>` is already a mapped type, and there's already the constraint `T extends Record<string, AnyModelField>`... Still, can't hurt to try?

Number 1 seems like the most likely to be remotely different, so let's try that I guess.

First I'll replace all instances of `Record<...>` with a type alias, say `AnyModelFieldset` so it's not just another type with an `s` on the end.

That produces the same error as before, which it should since it's a simple type alias and [type aliases are eager](https://github.com/Microsoft/TypeScript/issues/3496#issuecomment-128553540).

#### Option 1

Next, let's try number 1 to see if that has a material effect.

That does _not_ result in 0 errors.  Okay, followup question: are the errors essentially the same?

```
Type '$BarModel' is not assignable to type 'BaseModel<AnyModelFieldset>'.
  Types of property 'findWhere' are incompatible.
    Type '{ (where: WhereCondition<{ id: ModelField<number, false, true>; name: ModelField<string, true, true>; }>): QueryBuilder<RecordTypeOfFields<{ id: ModelField<number, false, true>; name: ModelField<string, true, true>; }>, RecordTypeOfFields<...>[]>; <TSelect extends AnyArray<...>>(where: WhereCondition<...>, select: T...' is not assignable to type '{ (where: WhereCondition<AnyModelFieldset>): QueryBuilder<RecordTypeOfFields<AnyModelFieldset>, RecordTypeOfFields<AnyModelFieldset>[]>; <TSelect extends AnyArray<string | number>>(where: WhereCondition<...>, select: TSelect): QueryBuilder<...>; }'.
      Type 'QueryBuilder<RecordTypeOfFields<{ id: ModelField<number, false, true>; name: ModelField<string, true, true>; }>, RecordTypeOfFields<{ id: ModelField<number, false, true>; name: ModelField<string, true, true>; }>[]>' is not assignable to type 'QueryBuilder<RecordTypeOfFields<AnyModelFieldset>, RecordTypeOfFields<AnyModelFieldset>[]>'.
        Types of property 'whereIn' are incompatible.
          Type 'WhereIn<RecordTypeOfFields<{ id: ModelField<number, false, true>; name: ModelField<string, true, true>; }>, RecordTypeOfFields<{ id: ModelField<number, false, true>; name: ModelField<string, true, true>; }>[]>' is not assignable to type 'WhereIn<RecordTypeOfFields<AnyModelFieldset>, RecordTypeOfFields<AnyModelFieldset>[]>'.
            Types of parameters 'values' and 'values' are incompatible.
              Type 'QueryBuilder<any, any>' is not assignable to type 'any[] | QueryCallback<any, unknown[]>'.
                Type 'QueryBuilder<any, any>' is missing the following properties from type 'any[]': length, pop, push, concat, and 27 more.
```

Looks like.  Damn.


### Option Back-to-the-Error-Message

Okay, that wasn't an option but I didn't feel like mapping over an already-mapped-type.

Let's look at the `WhereIn` types again:

```
// this
WhereIn<
    RecordTypeOfFields<{ id: ModelField<number, false, true>; name: ModelField<string, true, true>; }>,
    RecordTypeOfFields<{ id: ModelField<number, false, true>; name: ModelField<string, true, true>; }>[]
>

// is not assignable to
WhereIn<
    RecordTypeOfFields<AnyModelFieldset>,
    RecordTypeOfFields<AnyModelFieldset>[]
>
```

What overloads are being selected, actually?  Let's import that type, if we can, and just copy the above things over.

So, the return type of all the overloads is exactly the same, so that's useless.  We'll need the parameters instead.

And what do we get?

```typescript
type W1 = WhereIn<
  RecordTypeOfFields<{ id: ModelField<number, false, true>; name: ModelField<string, true, true>; }>,
  RecordTypeOfFields<{ id: ModelField<number, false, true>; name: ModelField<string, true, true>; }>[]
>;
// = [string[], Knex.QueryBuilder<unknown, unknown>]
type W1Args = W1 extends (...rest: infer TArgs) => any ? TArgs : never;

type W2 = WhereIn<
  RecordTypeOfFields<AnyModelFieldset>,
  RecordTypeOfFields<AnyModelFieldset>[]
>;
// = [string[], Knex.QueryBuilder<unknown, unknown>]
type W2Args = W2 extends (...rest: infer TArgs) => any ? TArgs : never;
```

Well that's annoying, it looks like it picked the last one.  Okay, then.  They're still neither considered extensions of each other, either.

```typescript
// = false
type W1xW2 = W1 extends W2 ? true : false;
// = false
type W2xW1 = W2 extends W1 ? true : false;
```

Maybe I can try inspecing the return value of `findWhere`?

```typescript
class $BarModel extends BaseModel({
  fields: {
    id: ModelField.increments().notInNew(),
    name: ModelField.string().notNullable(),
  },
}) {}

const BarModel = new $BarModel();
const Base!: BaseModel<AnyModelFieldset>;

type BarWhereIn = ReturnType<typeof BarModel.findWhere>['whereIn'];
type BaseWhereIn = ReturnType<typeof Base.findWhere>['whereIn'];
```

This nets us:

```typescript
type BarWhereIn = Knex.WhereIn<
    RecordTypeOfFields<{
        id: ModelField<number, false, true>;
        name: ModelField<string, true, true>;
    }>,
    Pick<
        RecordTypeOfFields<{
            id: ModelField<number, false, true>;
            name: ModelField<string, true, true>;
        }>,
        "id" | "name"
    >[]
>;

type BaseWhereIn = Knex.WhereIn<
    RecordTypeOfFields<Record<string, ModelField<any, boolean, boolean>>>,
    Pick<
        RecordTypeOfFields<Record<string, ModelField<any, boolean, boolean>>>,
        string
    >[]
>;
```

Which is what's returned by the second overload of findWhere...

And of course, they're not compatible:

```typescript
// = false;
type BarXBase = BarWhereIn extends BaseWhereIn ? true : false;
```

With an assignment giving us:

```
Type 'WhereIn<RecordTypeOfFields<{ id: ModelField<number, false, true>; name: ModelField<string, true, true>; }>, Pick<RecordTypeOfFields<{ id: ModelField<number, false, true>; name: ModelField<string, true, true>; }>, "id" | "name">[]>' is not assignable to type 'WhereIn<RecordTypeOfFields<Record<string, ModelField<any, boolean, boolean>>>, Pick<RecordTypeOfFields<Record<string, ModelField<any, boolean, boolean>>>, string>[]>'.
  Type 'QueryBuilder<RecordTypeOfFields<{ id: ModelField<number, false, true>; name: ModelField<string, true, true>; }>, Pick<RecordTypeOfFields<{ id: ModelField<number, false, true>; name: ModelField<string, true, true>; }>, "id" | "name">[]>' is not assignable to type 'QueryBuilder<RecordTypeOfFields<Record<string, ModelField<any, boolean, boolean>>>, Pick<RecordTypeOfFields<Record<string, ModelField<any, boolean, boolean>>>, string>[]>'.
    Types of property 'whereNull' are incompatible.
      Type 'WhereNull<RecordTypeOfFields<{ id: ModelField<number, false, true>; name: ModelField<string, true, true>; }>, Pick<RecordTypeOfFields<{ id: ModelField<number, false, true>; name: ModelField<string, true, true>; }>, "id" | "name">[]>' is not assignable to type 'WhereNull<RecordTypeOfFields<Record<string, ModelField<any, boolean, boolean>>>, Pick<RecordTypeOfFields<Record<string, ModelField<any, boolean, boolean>>>, string>[]>'.
        Type 'RecordTypeOfFields<Record<string, ModelField<any, boolean, boolean>>>' is not assignable to type 'RecordTypeOfFields<{ id: ModelField<number, false, true>; name: ModelField<string, true, true>; }>'.
```

Though now it's whereNull that's giving us guff.

Buh.


### MEH.

I decided to change the constraint from `TModel extends BaseModel<AnyFieldset>` to `TModel extends BaseModel<any>`.  Error vanished thanks no the hammer of `any`.  All praise `any`.  Now back to the bowels of hell with ye, `any`.

`BaseModel` itself still has a constraint on its fieldset param `TFields extends AnyFieldset` so at least in usage it's fine, and the `any` can be treated as an implementation detail to make the Knex types not barf.



## JSON Schema Nitty Gritty

So, generating a reasonable enough JSONSchema was not that difficult, it was mostly manually mapping the various `ColumnType`s to various descriptions, then taking into account nullability.


### Schema IDs

One thing that should be done is a [Schema ID](https://json-schema.org/understanding-json-schema/structuring.html#id).  We've kinda got two choices here:

1. Specify a full ID for every record type
2. Specify a fragment ID for every record type

Well, I mean, there's a third option, which is just "Let the dev specify any prefix, and they can pick what they want"

I guess one question to consider here is: What works best in an OpenAPI Doc?

Another question: How do `$ref`s work?

Swagger of course has a [nice short summary](https://swagger.io/docs/specification/using-ref/).

- Technically, it's dependent on the point of use if you can use Relative JSON Pointers, Absolute JSON Pointers, or both.
    - Swagger only refers to absolute pointers, so I'll assume most conforming tools only use those.
- As noted there, you can use:
    - Local absolute references: `#/definitions/schemas/FooRecord`
    - Document references: `other-schemas.json#/definitions/schemas/FooRecord`
    - URL references: `http://example.com/path/to/schemas.json#/definitions/schemas/FooRecord`
- Technically, JSON Schema doesn't care if a full URL in the `$id` is a valid URL, but it might be helpful with OpenAPI Documents.

Since most Swagger tool and OpenAPI examples and use only absolute refs, I'll assume that that's the case here, too, and that the `$id` is basically just a way to record a name.

So what's the best thing to do here?  Dunno, yet.  Guess I'll shelve it for now and come back when I've given thought to the broader question of OpenAPI doc integration.

I suppose one option is to just allow specifying a JSON Schema Path Generator function.  Or place it on as a method you can override, or ... something.


### Separate Utils?

Having all that JSON Schema stuff inside the classes themselves feels kinda gross.  Why not extract those into utility functions?  Then, `BaseModel` can still have its convenience methods on it, but they're basically just pre-bound calls to the utility functions.  That'd keep things nice and separate, slim down the classes.



## Implementation of Migrations

Now the meatiest of the meatiness: creating migrations.

This involves a few parts:

- Need a CLI script/command to actually do the migration creation.
- Need to create diffable discriptions.  Probably just serialize the Models somehow.  Probably a simple `toJSON()` will do, honestly.
- Need to implement the above diff algorithm.
- Need to implement migration codegen based on the diff results.
- Need to run the code through prettier so it's actually readable by humans.
- Need to actually save the previous model descriptions so we can actually diff things.



## On Converting Datetimes/Timestamps to JS Dates or Strings

Another issue I'll need to face here is that, if I want to be truely generic, I'll have to allow for configurition of this.  I'm pretty sure it just means adding a few type and config parameters here and there, but it's still something I'll need to do.

Specifically:

- All the utilities are parametrized by parametrizing a top-level export, which effectively serves as the exporter of everything else.
    - Since this is a NodeJS project, I'm not as concerned about size, but likely one could just use multiple paramtrizers if one wanted to actually slim things down.  Convenient?  Not as, but it works.
- Those parametrizations are typed using `T extends SomeInterface` constraints, so as to preserve exact types, thereby allowing config to drive both behavior and type derivation.
    - Obviously, if I wanted to cover the multiple-parametrizers case, I'd have to stipulate that proper use requires using `as const`, but anyway.
