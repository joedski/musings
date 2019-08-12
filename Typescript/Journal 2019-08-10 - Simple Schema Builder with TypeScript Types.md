Journal 2019-08-10 - Simple Schema Builder with TypeScript Types
========

Desired Operation:

- Fluent API to create a JSONSchema Object or Wrapper.
- Creates a TS Type/Interface to go with it.

Nice To Haves:

- The TS type doesn't look like a mess of intersections and unions.  Might not be possible.



## Flattening?

You can sometimes do it by using object-map types:

```typescript
type Flatten<TUgly> = {
    [K in keyof TUgly]: TUgly[K];
};
```

In simple intersections, it works fine:

```typescript
type SimpleBodge = { foo: string; } & { bar: number; };
// = { foo: string; bar: number }
type SimpleFlatten = Flatten<SimpleBodge>;
```

Doesn't quite work when you start involving Unions:

```typescript
type BodgedTogether = ({
    type: 'Foo';
    foo: number;
} | {
    type: 'Bing';
    bing: string;
}) & {
    bar: number;
};

// = Flatten<{...} & {...}> | Flatten<{...} & {...}>
type MaybeNotBodgedLooking = Flatten<BodgedTogether>;
```

Oh well.  Perhaps something more will occur to me at some point.  Until then, though, more work to be done.



## Just Create a Type From JSON Schema?

JSON Schema can get, well, complicated, so I'm not sure if this is entirely good to do.  A static-codegen would be far superior in performance, though TS is far more performant now than it was in the past.  Still, it's best to do as few weird things as possible, after all we're supposed to be writing functional documentation, not arcane incantations.

Save those for optimizations.

Regardless, it would be nice to have at least some simple runtime typegen, especially for ORM type things.  At least for me, DB Records don't tend to be more complicated than rows, as I don't like denormalizing data: It tends to get messy.  However, if I start out with well defined normalized data, then denormalizing it is easy: This property here has a type of that record-type there.  Done.

And of course, a solution that is good-enough to my needs is better than a perfect solution for every case.  My records don't tend to have things (yet) like "anyOf", "allOf", or "oneOf".  Save those for later.


### Let's Start Simple: Primitives

```json
{
    "type": "string"
}
```

```typescript
type FooRecord = string;
```

Now, we're not going to bother with ID-Name extraction since really you'll be able to use whatever alias you want for the type.  IDs are only for codegen.

The following should do the trick for the above:

```typescript
type TypeDescribedBy<TSchema> =
    TSchema extends { type: 'string' } ? string :
    TSchema extends { type: 'number' | 'integer' } ? number :
    TSchema extends { type: 'boolean' } ? boolean :
    TSchema extends { type: 'null' } ? null :
    never;
```

Seems like a good start.  Let's test that, using the new `const` top-level cast because it's swank.

```typescript
const numberSchema = { type: 'number' } as const;
// = number
type TypeDescribedByNumberSchema = TypeDescribedBy<typeof numberSchema>;

const integerSchema = { type: 'integer' } as const;
// = number
type TypeDescribedByIntegerSchema = TypeDescribedBy<typeof integerSchema>;

const nullSchema = { type: 'null' } as const;
// = null
type TypeDescribedByNullSchema = TypeDescribedBy<typeof nullSchema>;

// Negative case:
const fartSchema = { type: 'fart' } as const;
// = never
type TypeDescribedByFartSchema = TypeDescribedBy<typeof fartSchema>;
```

> I'm going to ignore the multiple-options typing of `{ type: ['string', 'number'] }` because that's not a case I need to deal with yet.  I imagine something like `TSchema extends { type: string[] } ? TypeDescribedBy<TypesUnion<TSchema>> : ...` should be a starting point for that, though.


### Next Step: Enums and Const

Another variation of primitives is Enums.

This presents us with an interesting option: Do we go strict and enforce that `type` and `enum` don't clash?  Or go pragmatic and only base the generated TS Type on `enum`?

Tough to say.  I'd like to say it'd be fine to have run-time only validation of that, but on the other hand early warnings on basic things is one of the main points of static types, so that you can offload always simulating that to the computer.

Well, coordination is complicated, so I'll start with just getting types out of the enum itself first.

In JSON Schema, the `enum` property is a tuple of valid values.  Now, we don't care about the tuple itself per se, (how's that for emphatic redundancy?) rather we care about the members therein.  So, we'll just extract that:

```typescript
const someTuple = ['foo', 'bar', 'baz'] as const;
// readonly ['foo', 'bar', 'baz']
type SomeTupleType = typeof someTuple;
// 'foo' | 'bar' | 'baz'
type SomeTupleMember = SomeTupleType[number];
```

> Aside: If you try `Extract<keyof SomeTupleType, number>` you just get `number`, because the indices themselves are typed as `"0" | "1" | "2"`.  Oh well.

So we get this:

```typescript
type TypeDescribedByEnum<TSchema> =
    TSchema extends { enum: infer TEnumTuple } ?
        TEnumTuple extends readonly any[] ?
            TEnumTuple[number]
        : never
    : never;
```

Interestingly, if you have a `readonly [...]`, then it only extends readonly things, so `readonly [...any[]]` or `readonly any[]`, but not `[...any[]]`.  TIL.

Of course, if we want to cover both `readonly` and non-`readonly` cases, we can just do

```typescript
type TypeDescribedByEnum<TSchema> =
    TSchema extends { enum: infer TEnumTuple } ?
        TEnumTuple extends (any[] | readonly any[]) ?
            TEnumTuple[number]
        : never
    : never;
```

With paretheses added for clarity.

#### Optionally: Coordination

So what about `{ type: 'string', enum: ['foo', 'bar', 'baz'] }`?

Perhaps something like this, then?

```typescript
type TypeDescribedByEnum<TSchema> =
    TSchema extends { type: infer TType, enum: infer TEnumTupleWithType } ?
        TEnumTupleWithType extends (any[] | readonly any[]) ?
            Extract<TEnumTupleWithType[number], TypeDescribedBy<{ type: TType }>>
        : never
    : TSchema extends { enum: infer TEnumTuple } ?
        TEnumTuple extends (any[] | readonly any[]) ?
            TEnumTuple[number]
        : never
    : never;
```

That'll only allow valid enums, but what if we didn't want to allow it at all?

```typescript
type Enum1 = 'foo' | 'bar' | 5;
// = false
type Ex1 = Enum1 extends Extract<Enum1, string> ? true : false;
```

So basically, add that as another condition in the coordinated case.

```typescript
type TypeDescribedByEnum<TSchema> =
    TSchema extends { type: infer TType, enum: infer TEnumTupleWithType } ?
        TEnumTupleWithType extends (any[] | readonly any[]) ?
            TEnumTupleWithType[number] extends Extract<TEnumTupleWithType[number], TypeDescribedBy<{ type: TType }>> ?
                TEnumTupleWithType[number]
            : never
        : never
    : TSchema extends { enum: infer TEnumTuple } ?
        TEnumTuple extends (any[] | readonly any[]) ?
            TEnumTuple[number]
        : never
    : never;

const enumSchema = { enum: ['foo', 'bar', 'baz', 5] } as const;
// = 'foo' | 'bar' | 'baz' | 5
type TypeDescribedByEnumSchema = TypeDescribedByEnum<typeof enumSchema>;

const enumAndTypeSchema = { type: 'string', enum: ['foo', 'bar', 'baz'] } as const;
// = 'foo' | 'bar' | 'baz'
type TypeDescribedByEnumAndTypeSchema = TypeDescribedByEnum<typeof enumAndTypeSchema>;

const badEnumAndTypeSchema = { type: 'string', enum: ['foo', 5] } as const;
// = never
type TypeDescribedByBadEnumAndTypeSchema = TypeDescribedByEnum<typeof badEnumAndTypeSchema>;
```

Only issue there is that `never` isn't the most descriptive thing in the world, so you might run into an issue where you just mysteriously get a `never` somewhere and it metastisizes outwards to block everything.

#### Is Never the Correct Behavior for Enum/Type Mismatches?

Going by a plain reading of the JSON Spec, not really.  Rather, each keyword is validated against separately, the proper behavior is really just `Extract<TEnumTupleWithType[number], TypeDescribedBy<{ type: TType }>>`, not `never`.  That's probably more helpful, too.

Thus, the final result is actually just this:

```typescript
type TypeDescribedByEnum<TSchema> =
    TSchema extends { type: infer TType, enum: infer TEnumTupleWithType } ?
        TEnumTupleWithType extends (any[] | readonly any[]) ?
            Extract<TEnumTupleWithType[number], TypeDescribedBy<{ type: TType }>>
        : never
    : TSchema extends { enum: infer TEnumTuple } ?
        TEnumTuple extends (any[] | readonly any[]) ?
            TEnumTuple[number]
        : never
    : never;

const enumSchema = { enum: ['foo', 'bar', 'baz', 5] } as const;
// = 'foo' | 'bar' | 'baz' | 5
type TypeDescribedByEnumSchema = TypeDescribedByEnum<typeof enumSchema>;

const enumAndTypeSchema = { type: 'string', enum: ['foo', 'bar', 'baz'] } as const;
// = 'foo' | 'bar' | 'baz'
type TypeDescribedByEnumAndTypeSchema = TypeDescribedByEnum<typeof enumAndTypeSchema>;

const badEnumAndTypeSchema = { type: 'string', enum: ['foo', 5] } as const;
// = 'foo'
type TypeDescribedByBadEnumAndTypeSchema = TypeDescribedByEnum<typeof badEnumAndTypeSchema>;
```

So that's one less conditional type nesting.

#### Enums In the Top Level Type

That settled, let's add that to the base type:

```typescript
type TypeDescribedBy<TSchema> =
    TSchema extends { enum: any } ? TypeDescribedByEnum<TSchema> :
    TSchema extends { type: any } ? TypeDescribedByPrimitive<TSchema> :
    never;

type TypeDescribedByPrimitive<TSchema> =
    TSchema extends { type: 'string' } ? string :
    TSchema extends { type: 'number' | 'integer' } ? number :
    TSchema extends { type: 'boolean' } ? boolean :
    TSchema extends { type: 'null' } ? null :
    never;

type TypeDescribedByEnum<TSchema> =
    TSchema extends { type: infer TType, enum: infer TEnumTupleWithType } ?
        TEnumTupleWithType extends (any[] | readonly any[]) ?
            // Since JSONSchema keywords validate separately, enum + type acts like an Extract<T, U>.
            Extract<TEnumTupleWithType[number], TypeDescribedByPrimitive<{ type: TType }>>
        : never
    : TSchema extends { enum: infer TEnumTuple } ?
        TEnumTuple extends (any[] | readonly any[]) ?
            TEnumTuple[number]
        : never
    : never;
```

And a running test set of:

```
const numberSchema = { type: 'number' } as const;
// = number
type TypeDescribedByNumberSchema = TypeDescribedBy<typeof numberSchema>;

const integerSchema = { type: 'integer' } as const;
// = number
type TypeDescribedByIntegerSchema = TypeDescribedBy<typeof integerSchema>;

const nullSchema = { type: 'null' } as const;
// = null
type TypeDescribedByNullSchema = TypeDescribedBy<typeof nullSchema>;

// Negative case:
const fartSchema = { type: 'fart' } as const;
// = never
type TypeDescribedByFartSchema = TypeDescribedBy<typeof fartSchema>;

const enumSchema = { enum: ['foo', 'bar', 'baz', 5] } as const;
// = 'foo' | 'bar' | 'baz' | 5
type TypeDescribedByEnumSchema = TypeDescribedBy<typeof enumSchema>;

const enumAndTypeSchema = { type: 'string', enum: ['foo', 'bar', 'baz'] } as const;
// = 'foo' | 'bar' | 'baz'
type TypeDescribedByEnumAndTypeSchema = TypeDescribedBy<typeof enumAndTypeSchema>;

const badEnumAndTypeSchema = { type: 'string', enum: ['foo', 5] } as const;
// = 'foo'
type TypeDescribedByBadEnumAndTypeSchema = TypeDescribedBy<typeof badEnumAndTypeSchema>;
```


### Objects

Next thing I'm going to do is Objects, because there's actually fewer things to do there than with Arrays.

About the most complicated thing with Objects is that `properties` coordinates with `required`.

As we've seen above, it's entirely possible to do this coordination, just an extra thing to handle:

```typescript
type TypeDescribedByProperties<TSchema> =
    TSchema extends { properties: object } ?
        // As shown in the TS docs, to have both optional and non-optional,
        // you do need to do an intersection.
        Flatten<{
            [K in RequiredPropertyNames<TSchema>]: TypeDescribedBy<TSchema['properties'][K]>;
        } & {
            [K in OptionalPropertyNames<TSchema>]?: TypeDescribedBy<TSchema['properties'][K]>;
        }>
    : never;

type RequiredPropertyNames<TSchema> =
    TSchema extends { required: infer TRequiredTuple } ?
        TRequiredTuple extends (string[] | readonly string[]) ?
            TRequiredTuple[number]
        : never
    : never;

type OptionalPropertyNames<TSchema> =
    TSchema extends { properties: object } ?
        Exclude<keyof TSchema['properties'], RequiredPropertyNames<TSchema>>
    : never;
```

And a test of that:

```typescript
const objSchema1 = {
    "type": "object",
    "properties": {
        "foo": { "type": "number" },
        "bar": { "type": "string" }
    },
    "required": [
        "foo"
    ]
} as const;
// = {
//     foo: number;
//     bar?: string | undefined;
// }
type ObjType1 = TypeDescribedByProperties<typeof objSchema1>;
```

#### Edge Case: Object-Type With No Properties Definition

In this case, just add another branch to the `TypeDescribedByPrimitive<TSchema>` type, with the unhelpful `object` type:

```typescript
type TypeDescribedByPrimitive<TSchema> =
    TSchema extends { type: 'string' } ? string :
    TSchema extends { type: 'number' | 'integer' } ? number :
    TSchema extends { type: 'boolean' } ? boolean :
    TSchema extends { type: 'null' } ? null :
    // not helpful?  describe your bloody object, then.
    TSchema extends { type: 'object' } ? object :
    TSchema extends { type: 'array' } ? any[] :
    never;
```

There's also the possibility that it's just a JSON object blob that you have to conditionally poke through every time, in which case `object` is probably the best you can do at this point.

#### Consideration: Extra Props (How To Consider: Not In My Use Case!)

By default, JSON Schema is permissive when it comes to extra props as it only validates what's present unless told otherwise, whereas TypeScript on the other hand is restrictive by default.  In my use case, that's not something we're going to consider right now because I'm oriented towards an ORM type setup, and in that case we (_really_ ought to) know what's getting returned from the DB.

#### "Edge" Case: Properties and Required Are Not Actually Coordinated

Fun fact: `required` and `properties` are actually two entirely separate keywords.  One only check for the presence of a property, the other describes a property _if present_, but doesn't say anything about if it's actually there or not.

This also kinda coincides with the fact that `{}` is a valid JSON Schema which just passes validation regardless of what's passed in because the default validation value starts as Passed Validation.

So, this means a few things:

- The default type is not `never` but `any` or `unknown`.  The latter is stricter, so I'll use that.
- If a property name appears in `required` but not in `properties`, it should receive a type as though its schema were `{}`, which according to my previous point means `unknown`.


```
{
    "type": "object",
    "properties": {
        "foo": { "type": "number" },
        "bar": { "type": "string" }
    },
    "required": [
        "foo"
    ]
}
```

This corresponds to the following type:

```typescript
type ObjType = {
    foo: number;
    bar?: string | undefined;
};
```

#### Edge Case: Mixing Properties and Primitives

Teeechnically, I'm pretty sure that going by the JSON Schema Spec if you specify only `properties` and not `type: "object"`, then the input value could be a number and it would still validate, because `properties` only validates properties _if those properties are present_, and numbers don't have properties, so none of them get checked.

You shouldn't do that, though.  I'm not sure it's worth enforcing that?  How simple is it to do that?

Adding `type?: 'object'` to the `properties` type at least works well enough, but not sure about `required`.

```typescript
const numberAndPropertiesSchema = {
    type: 'number',
    properties: {
        foo: { type: 'string' },
    },
} as const;
// = number; as expected.
type NumberAndPropertiesType = TypeDescribedBy<typeof numberAndPropertiesSchema>;

const numberAndRequiredSchema = {
    type: 'number',
    required: ['foo'],
} as const;
// = { foo: unknown }; what should happen here, though?
type NumberAndRequiredType = TypeDescribedBy<typeof numberAndRequiredSchema>;
```

The other option is to just explicitly opt out of non-object types for those combinations.

```typescript
type TypeDescribedBy<TSchema> =
    TSchema extends { type?: 'object' } & ({ properties: any } | { required: any }) ? TypeDescribedByProperties<TSchema> :
    TSchema extends { type?: any } & ({ properties: any } | { required: any }) ? never :
    // ...
    unknown;
```

That might be better, honestly.

#### In Summary: Objects! (And More Spec-Appropriate Defaults!)

```typescript
type TypeDescribedBy<TSchema> =
    TSchema extends { type?: 'object' } & ({ properties: any } | { required: any }) ? TypeDescribedByProperties<TSchema> :
    TSchema extends { type?: any } & ({ properties: any } | { required: any }) ? never :
    TSchema extends { enum: any } ? TypeDescribedByEnum<TSchema> :
    TSchema extends { const: any } ? TypeDescribedByConst<TSchema> :
    TSchema extends { type: any } ? TypeDescribedByPrimitive<TSchema> :
    unknown;

type TypeDescribedByPrimitive<TSchema> =
    TSchema extends { type: 'string' } ? string :
    TSchema extends { type: 'number' | 'integer' } ? number :
    TSchema extends { type: 'boolean' } ? boolean :
    TSchema extends { type: 'null' } ? null :
    // not helpful?  describe your bloody object, then.
    TSchema extends { type: 'object' } ? object :
    TSchema extends { type: 'array' } ? unknown[] :
    unknown;

type TypeDescribedByEnum<TSchema> =
    TSchema extends { type: infer TType, enum: infer TEnumTupleWithType } ?
        TEnumTupleWithType extends (any[] | readonly any[]) ?
            // Since JSONSchema keywords validate separately, enum + type acts like an Extract<T, U>.
            Extract<TEnumTupleWithType[number], TypeDescribedByPrimitive<{ type: TType }>>
        : never
    : TSchema extends { enum: infer TEnumTuple } ?
        TEnumTuple extends (any[] | readonly any[]) ?
            TEnumTuple[number]
        : never
    // Empty enum should invalidate anything.
    : never;

type TypeDescribedByConst<TSchema> =
    TSchema extends { const: infer TConstValueWithType; type: infer TConstType } ?
        Extract<TConstValueWithType, TypeDescribedByPrimitive<{ type: TConstType }>>
    : TSchema extends { const: infer TConstValue } ?
        TConstValue
    : never;

type TypeDescribedByProperties<TSchema> =
    TSchema extends { properties: object } ?
        // As shown in the TS docs, to have both optional and non-optional,
        // you do need to do an intersection.
        Flatten<{
            [K in RequiredPropertyNames<TSchema>]: TypeDescribedBy<TSchema['properties'][K]>;
        } & {
            [K in OptionalPropertyNames<TSchema>]?: TypeDescribedBy<TSchema['properties'][K]>;
        }>
    : TSchema extends { required: any[] | readonly any[] } ?
        { [K in RequiredPropertyNames<TSchema>]: unknown }
    : unknown;

type RequiredPropertyNames<TSchema> =
    TSchema extends { required: infer TRequiredTuple } ?
        TRequiredTuple extends (string[] | readonly string[]) ?
            TRequiredTuple[number]
        : never
    : never;

type OptionalPropertyNames<TSchema> =
    TSchema extends { properties: object } ?
        Exclude<keyof TSchema['properties'], RequiredPropertyNames<TSchema>>
    : never;
```

And the ever growing pool of tests:

> Aside: the literal `[]` gets an inferred type of `never[]`, so using `[][0]` gives us a value of type `never`... And only `never` is assignable to `never`, so I just decided to do that here.  Doesn't help if the type is `unknown`, though.  That swallows up anything, like `any` does.

```typescript
const emptySchema = {} as const;
// = unknown
type TypeDescribedByEmptySchema = TypeDescribedBy<typeof emptySchema>;
const e1: TypeDescribedByEmptySchema = 5;

const numberSchema = { type: 'number' } as const;
// = number
type TypeDescribedByNumberSchema = TypeDescribedBy<typeof numberSchema>;
const n1: TypeDescribedByNumberSchema = 5;

const integerSchema = { type: 'integer' } as const;
// = number
type TypeDescribedByIntegerSchema = TypeDescribedBy<typeof integerSchema>;
// JS doesn't have an integer type, so eh.
const n2: TypeDescribedByIntegerSchema = 5;

const nullSchema = { type: 'null' } as const;
// = null
type TypeDescribedByNullSchema = TypeDescribedBy<typeof nullSchema>;
const null1: TypeDescribedByNullSchema = null;

// Negative case:
const fartSchema = { type: 'fart' } as const;
// = never
type TypeDescribedByFartSchema = TypeDescribedBy<typeof fartSchema>;
const fartValue: TypeDescribedByFartSchema = [][0];

const enumSchema = { enum: ['foo', 'bar', 'baz', 5] } as const;
// = 'foo' | 'bar' | 'baz' | 5
type TypeDescribedByEnumSchema = TypeDescribedBy<typeof enumSchema>;
const enum1: TypeDescribedByEnumSchema[] = ['baz', 5, 'bar', 'baz'];

const enumAndTypeSchema = { type: 'string', enum: ['foo', 'bar', 'baz'] } as const;
// = 'foo' | 'bar' | 'baz'
type TypeDescribedByEnumAndTypeSchema = TypeDescribedBy<typeof enumAndTypeSchema>;
const enum2: TypeDescribedByEnumAndTypeSchema[] = ['foo', 'baz', 'foo'];

const badEnumAndTypeSchema = { type: 'string', enum: ['foo', 5] } as const;
// = 'foo'
type TypeDescribedByBadEnumAndTypeSchema = TypeDescribedBy<typeof badEnumAndTypeSchema>;
const enum3: TypeDescribedByBadEnumAndTypeSchema[] = ['foo', 'foo'];

const objSchema1 = {
    "type": "object",
    "properties": {
        "foo": { "type": "number" },
        "bar": { "type": "string" }
    },
    "required": [
        "foo"
    ]
} as const;
// = {
//     foo: number;
//     bar?: string | undefined;
// }
type ObjType1 = TypeDescribedBy<typeof objSchema1>;
const objs1: ObjType1[] = [{ foo: 5 }, { foo: 6, bar: 'yay' }];

const objSchemaNoRequired = {
    type: 'object',
    properties: {
        "foo": { "type": "number" },
        "bar": { "type": "string" }
    }
} as const;
// = {
//     foo?: number | undefined;
//     bar?: string | undefined;
// }
type ObjTypeNoRequired = TypeDescribedBy<typeof objSchemaNoRequired>;
const objs2: ObjTypeNoRequired[] = [{}, { foo: 5 }, { foo: 6, bar: 'yay' }];

const objSchemaNoProps = {
    required: ['foo', 'bar'],
} as const;
// = {
//     foo: unknown;
//     bar: unknown;
// }
type ObjTypeNoProps = TypeDescribedBy<typeof objSchemaNoProps>;
const objs3: ObjTypeNoProps[] = [{ foo: 'boop', bar: 'beep' }, { foo: 5, bar: 6 }];

const numberAndPropertiesSchema = {
    type: 'number',
    properties: {
        foo: { type: 'string' },
    },
} as const;
// = never
type NumberAndPropertiesType = TypeDescribedBy<typeof numberAndPropertiesSchema>;
const numberAndPropertiesValue: NumberAndPropertiesType = [][0];

const numberAndRequiredSchema = {
    type: 'number',
    required: ['foo'],
} as const;
// = never
type NumberAndRequiredType = TypeDescribedBy<typeof numberAndRequiredSchema>;
const numberAndRequiredValue: NumberAndRequiredType = [][0];
```

#### Object-Related Things I'm Not Bothering With

- `additionalProperties` lets you specify a schema for any properties that don't have a corresponding schema in `properties`.  Useful in some cases, but not for my use case.  It would also complicate type derivation, and I'm not sure off hand if it's actually possible to do that.
- `patternProperties` and `propertyNames` are related to the keys themselves.  TS types don't do that.
- `minProperties` and `maxProperties` are about how many properties are on an object.  Not really sensical in TS types.
- `dependencies` greately complicates things and doesn't really apply to how I tend to make DB schemas, so gonna pass on this.


### Arrays

One of the more fun ones.  `type: "array"` covers a number of use cases, just like in JS Arrays:

- Arrays of N Values
- Tuples with Typed Elements
- Tuples with Rest Types
- Some other curious cases.

First I'll outline the parts I will and won't tackle, then I'll try to tackle each one.

- `items` is the main driver of `type: "array"` schemas, and has two modes:
    - `items: {...}` defines an `Array<T>` schema, where the Array can have N items all of which must validate against the schema given at `items`.
        - Note that in this form, the JSON Schema Spec specifies that `additionalItems` is _ignored_.
    - `items: [...]` defines a `[T, U, ...etc]` (Tuple) schema, where the Array must have items that validate against the given schema at the same index.
        - In this form, `additionalItems` specifies the schema (if any) for the arbitrary number of items after the items specified in `items`.  The rest type, basically.
- `minItems`, `maxItems` I'm going to veto right out.  I don't feel like creating arbitrarily long index unions, and it really falls under the purview of program logic rather than type logic.
- `uniqueItems` is also a program logic thing rather than a type logic thing, at least in TS.
- `contains` is actually possible to do.  It's basically `Contains<T, U> = U extends AnyItemIn<T> ? T : never` where `AnyItemIn<T> = T extends (any[] | readonly any[]) ? T[number] : never`.

#### List-Arrays

The simplest case to handle is that of List-Arrays.

```typescript
type TypeDescribedBy<TSchema> =
    // ... objects
    // tuples have to be handled first, but we'll get to them later...
    // TSchema extends { type?: 'array', items: any[] } ? TypeDescribedByTuple<TSchema> :
    TSchema extends { type?: 'array', items: object } ? TypeDescribedByList<TSchema> :
    // ...
    unknown;

type TypeDescribedByList<TSchema> =
    TSchema extends { items: infer TItemSchema } ?
        Array<TypeDescribedBy<TSchema>>
    : never;
```

```typescript
const list1 = {
    type: 'array',
    items: {
        type: 'string'
    }
} as const;
type TypeDescribedByList1 = TypeDescribedBy<typeof list1>;
const list1Value: TypeDescribedByList1 = ['foo', 'asdf', 'a string'];
```

#### List-Arrays: Oops, Circular Reference

Oh, were it that simple.  While other things are happy enough reusing `TypeDescribedBy` on subsections, this one seems to have run afoul of something, as I now receive the error `Type alias 'TypeDescribedBy' circularly references itself.` which is mighty disappointing indeed.

This is especially perplexing as it seemed to handle the mapped-type used in the Properties/Required cases.

Upon some light research, it seems the answer is that [interface (and mapped type?) members and interface base-types are lazily resolved, while type aliases generally are eagerly resolved](https://github.com/Microsoft/TypeScript/issues/3496#issuecomment-128553540).  To quote their example:

```typescript
type JSONValue = string | number | boolean | JSONObject | JSONArray;

// OK: Interface member is lazily resolved.
interface JSONObject {
    [x: string]: JSONValue;
}

// OK: Interface base-type is lazily resolved.
interface JSONArray extends Array<JSONValue> {}
```

So, how to apply that here?

I think I'll apply the type guard condition in the top-level alias, but use an interface to lazify the Array type like they do with the `JSONArray` thingy.

```typescript
type TypeDescribedBy<TSchema> =
    TSchema extends { type?: 'object' } & ({ properties: any } | { required: any }) ? TypeDescribedByProperties<TSchema> :
    TSchema extends { type?: any } & ({ properties: any } | { required: any }) ? never :
    TSchema extends { type?: 'array', items: infer TItemsSchema } ? ListDescribedBy<TItemsSchema> :
    TSchema extends { enum: any } ? TypeDescribedByEnum<TSchema> :
    TSchema extends { const: any } ? TypeDescribedByConst<TSchema> :
    TSchema extends { type: any } ? TypeDescribedByPrimitive<TSchema> :
    unknown;

interface ListDescribedBy<TItemsSchema> extends Array<TypeDescribedBy<TItemsSchema>> {}
```

And... Well, it does work, more or less: Instead of `Array<string>` we get `ListDescribedBy<{ readonly type: 'string' }>`, and it does reject things that are not strings.  So, modified rapture.

Hm.  Can we use an object type to do that, too?  Or rather, is that equivalent to an inline interface?

It is, until you reference the key, which switches things from lazy to eager, I guess.

```
// Type alias 'TypeDescribedBy' circularly references itself.
type ListDescribedBy<TItemsSchema> = { foo: TypeDescribedBy<TItemsSchema> }['foo'];
```

Ah well, extension trick it is.

#### Tuple-Arrays

While previously this would've required jumping into function arguments as an intermediate, [since TS 3.1 we've been able to do mapped-tuple-types](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-1.html), so all is well there.  Given that mapped types for the object cases seemed to not invoke circularly-referenced-self errors before, maybe that'll work here as well?

First, let's break things out a bit:

```typescript
type TypeDescribedBy<TSchema> =
    TSchema extends { type?: 'object' } & ({ properties: any } | { required: any }) ? TypeDescribedByProperties<TSchema> :
    TSchema extends { type?: any } & ({ properties: any } | { required: any }) ? never :
    TSchema extends { type?: 'array', items: any } ? TypeDescribedByArray<TSchema> :
    TSchema extends { enum: any } ? TypeDescribedByEnum<TSchema> :
    TSchema extends { const: any } ? TypeDescribedByConst<TSchema> :
    TSchema extends { type: any } ? TypeDescribedByPrimitive<TSchema> :
    unknown;

type TypeDescribedByArray<TSchema> =
    TSchema extends { items: infer TItemsSchema } ?
        ListDescribedBy<TItemsSchema>
    : never;

interface ListDescribedBy<TItemsSchema> extends Array<TypeDescribedBy<TItemsSchema>> {}
```

Next, let's setup a test type:

```typescript
const tuple1 = {
    type: 'array',
    items: [
        { const: 'FOO' },
        { type: 'string' },
        { type: 'number' },
    ]
} as const;
// = readonly ['FOO', string, number]
type TypeDescribedByTuple1 = TypeDescribedBy<typeof tuple1>;
const tuple1Values: TypeDescribedByTuple1[] = [
    ['FOO', 'a string', 5],
    ['FOO', 'another string', 7],
];
```

Then, add tuple-items support:

```typescript
type TypeDescribedByArray<TSchema> =
    TSchema extends { items: infer TItemsSchema } ?
        TItemsSchema extends (any[] | readonly any[]) ?
            { [I in keyof TItemsSchema]: TypeDescribedBy<TItemsSchema[I]>; }
        : ListDescribedBy<TItemsSchema>
    : never;
```

#### Tuple-Arrays: Additional Items?

That was easy enough.  How about rest-items support?  Let's try... Ah, dang, first stab at mixing mapped tuples and such doesn't work:

```typescript
type TupleTypeWithRest<TItemsSchema, TAdditionalItemsSchema> =
    TItemsSchema extends [...any[]] ? TAdditionalItemsSchema extends any[] ?
        [
            ...{ [k in keyof TItemsSchema]: TypeDescribedBy<TItemsSchema[k]> },
            ...TAdditionalItemsSchema
        ]
    : never : never;
```

Can only do rest types at the end of a tuple... So, what to do about that?

Nothing, I guess.  The only other option I can think of eagerly expands the subschemas, which will invoke the circularly-references-self error again.

Probably.  What would that look like, anyway?

```typescript
type TupleItemsDescribedBy<TItemsSchema> =
    TItemsSchema extends (any[] | readonly any[]) ?
        { [I in keyof TItemsSchema]: TypeDescribedBy<TItemsSchema[I]>; }
    : never;

type TupleWithRest<TItemsSchema, TRestSchema> =
    TItemsSchema extends [] ?
        TRestSchema extends any[] ?
            TRestSchema
        : []
    : TItemsSchema extends [infer THead, ...infer TRest] ?
        [THead, ...TupleWithRest<TRest, TRestSchema>]
    : [];
```

Ah, that pretty clearly references itself... also `infer TRest` there doesn't really work, so, no dice.

The target type is something like `[T, U, V, ...TRest[]]`.  That's the sort of thing described by `{ items: [...], additionalItems: {...} }`.  The question is, how do you do that dynamically?

There's maybe a way to do it, but honestly it's not a case I need to worry about (yet?) so I'm just going to leave it off.  Most cases I can think of are probably more clearly done another way, anyway, and if I really do need to try solving it... then, well, I'll try again.

#### Array Schemas: Results:

```typescript
type TypeDescribedBy<TSchema> =
    TSchema extends { type?: 'object' } & ({ properties: any } | { required: any }) ? TypeDescribedByProperties<TSchema> :
    TSchema extends { type?: any } & ({ properties: any } | { required: any }) ? never :
    TSchema extends { type?: 'array', items: any } ? TypeDescribedByArray<TSchema> :
    TSchema extends { enum: any } ? TypeDescribedByEnum<TSchema> :
    TSchema extends { const: any } ? TypeDescribedByConst<TSchema> :
    TSchema extends { type: any } ? TypeDescribedByPrimitive<TSchema> :
    unknown;

type TypeDescribedByArray<TSchema> =
    TSchema extends { items: infer TItemsSchema } ?
        TItemsSchema extends (any[] | readonly any[]) ?
            { [I in keyof TItemsSchema]: TypeDescribedBy<TItemsSchema[I]>; }
        : ListDescribedBy<TItemsSchema>
    : never;

// An interface with a parametrized base interface is used to lazify
// expansion, preventing "type alias circularly references itself" errors.
// Unfortunately, it resulst in types like "ListDescribedBy<{ readonly type: 'string' }>",
// which aren't exactly the most readable.
// https://github.com/Microsoft/TypeScript/issues/3496#issuecomment-128553540
// TODO: more formal source?
interface ListDescribedBy<TItemsSchema> extends Array<TypeDescribedBy<TItemsSchema>> {}

type TypeDescribedByPrimitive<TSchema> =
    TSchema extends { type: 'string' } ? string :
    TSchema extends { type: 'number' | 'integer' } ? number :
    TSchema extends { type: 'boolean' } ? boolean :
    TSchema extends { type: 'null' } ? null :
    // not helpful?  describe your bloody object, then.
    TSchema extends { type: 'object' } ? object :
    TSchema extends { type: 'array' } ? unknown[] :
    // unrecognized type? probably invalid.
    never;

type TypeDescribedByEnum<TSchema> =
    TSchema extends { type: infer TType, enum: infer TEnumTupleWithType } ?
        TEnumTupleWithType extends (any[] | readonly any[]) ?
            // Since JSONSchema keywords validate separately, enum + type acts like an Extract<T, U>.
            Extract<TEnumTupleWithType[number], TypeDescribedByPrimitive<{ type: TType }>>
        : never
    : TSchema extends { enum: infer TEnumTuple } ?
        TEnumTuple extends (any[] | readonly any[]) ?
            TEnumTuple[number]
        : never
    // Empty enum should invalidate anything.
    : never;

type TypeDescribedByConst<TSchema> =
    TSchema extends { const: infer TConstValueWithType; type: infer TConstType } ?
        Extract<TConstValueWithType, TypeDescribedByPrimitive<{ type: TConstType }>>
    : TSchema extends { const: infer TConstValue } ?
        TConstValue
    : never;

type TypeDescribedByProperties<TSchema> =
    TSchema extends { properties: object } ?
        // As shown in the TS docs, to have both optional and non-optional,
        // you do need to do an intersection.
        Flatten<{
            [K in RequiredPropertyNames<TSchema>]: TypeDescribedBy<TSchema['properties'][K]>;
        } & {
            [K in OptionalPropertyNames<TSchema>]?: TypeDescribedBy<TSchema['properties'][K]>;
        }>
    : TSchema extends { required: any[] | readonly any[] } ?
        { [K in RequiredPropertyNames<TSchema>]: unknown }
    : unknown;

type RequiredPropertyNames<TSchema> =
    TSchema extends { required: infer TRequiredTuple } ?
        TRequiredTuple extends (string[] | readonly string[]) ?
            TRequiredTuple[number]
        : never
    : never;

type OptionalPropertyNames<TSchema> =
    TSchema extends { properties: object } ?
        Exclude<keyof TSchema['properties'], RequiredPropertyNames<TSchema>>
    : never;
```

And then our test cases:

```typescript
const emptySchema = {} as const;
// = unknown
type TypeDescribedByEmptySchema = TypeDescribedBy<typeof emptySchema>;
const e1: TypeDescribedByEmptySchema = 5;

const numberSchema = { type: 'number' } as const;
// = number
type TypeDescribedByNumberSchema = TypeDescribedBy<typeof numberSchema>;
const n1: TypeDescribedByNumberSchema = 5;

const integerSchema = { type: 'integer' } as const;
// = number
type TypeDescribedByIntegerSchema = TypeDescribedBy<typeof integerSchema>;
// JS doesn't have an integer type, so eh.
const n2: TypeDescribedByIntegerSchema = 5;

const nullSchema = { type: 'null' } as const;
// = null
type TypeDescribedByNullSchema = TypeDescribedBy<typeof nullSchema>;
const null1: TypeDescribedByNullSchema = null;

// Negative case:
const fartSchema = { type: 'fart' } as const;
// = never
type TypeDescribedByFartSchema = TypeDescribedBy<typeof fartSchema>;
const fartValue: TypeDescribedByFartSchema = [][0];

const enumSchema = { enum: ['foo', 'bar', 'baz', 5] } as const;
// = 'foo' | 'bar' | 'baz' | 5
type TypeDescribedByEnumSchema = TypeDescribedBy<typeof enumSchema>;
const enum1: TypeDescribedByEnumSchema[] = ['baz', 5, 'bar', 'baz'];

const enumAndTypeSchema = { type: 'string', enum: ['foo', 'bar', 'baz'] } as const;
// = 'foo' | 'bar' | 'baz'
type TypeDescribedByEnumAndTypeSchema = TypeDescribedBy<typeof enumAndTypeSchema>;
const enum2: TypeDescribedByEnumAndTypeSchema[] = ['foo', 'baz', 'foo'];

const badEnumAndTypeSchema = { type: 'string', enum: ['foo', 5] } as const;
// = 'foo'
type TypeDescribedByBadEnumAndTypeSchema = TypeDescribedBy<typeof badEnumAndTypeSchema>;
const enum3: TypeDescribedByBadEnumAndTypeSchema[] = ['foo', 'foo'];

const objSchema1 = {
    "type": "object",
    "properties": {
        "foo": { "type": "number" },
        "bar": { "type": "string" }
    },
    "required": [
        "foo"
    ]
} as const;
// = {
//     foo: number;
//     bar?: string | undefined;
// }
type ObjType1 = TypeDescribedBy<typeof objSchema1>;
const objs1: ObjType1[] = [{ foo: 5 }, { foo: 6, bar: 'yay' }];

const objSchemaNoRequired = {
    type: 'object',
    properties: {
        "foo": { "type": "number" },
        "bar": { "type": "string" }
    }
} as const;
// = {
//     foo?: number | undefined;
//     bar?: string | undefined;
// }
type ObjTypeNoRequired = TypeDescribedBy<typeof objSchemaNoRequired>;
const objs2: ObjTypeNoRequired[] = [{}, { foo: 5 }, { foo: 6, bar: 'yay' }];

const objSchemaNoProps = {
    required: ['foo', 'bar'],
} as const;
// = {
//     foo: unknown;
//     bar: unknown;
// }
type ObjTypeNoProps = TypeDescribedBy<typeof objSchemaNoProps>;
const objs3: ObjTypeNoProps[] = [{ foo: 'boop', bar: 'beep' }, { foo: 5, bar: 6 }];

const numberAndPropertiesSchema = {
    type: 'number',
    properties: {
        foo: { type: 'string' },
    },
} as const;
// = never
type NumberAndPropertiesType = TypeDescribedBy<typeof numberAndPropertiesSchema>;
const numberAndPropertiesValue: NumberAndPropertiesType = [][0];

const numberAndRequiredSchema = {
    type: 'number',
    required: ['foo'],
} as const;
// = never
type NumberAndRequiredType = TypeDescribedBy<typeof numberAndRequiredSchema>;
const numberAndRequiredValue: NumberAndRequiredType = [][0];

const list1 = {
    type: 'array',
    items: {
        type: 'string'
    }
} as const;
// = ListDescribedBy<{ readonly type: "string"; }>
type TypeDescribedByList1 = TypeDescribedBy<typeof list1>;
const list1Value1: TypeDescribedByList1 = ['foo', 'asdf', 'a string'];

const tuple1 = {
    type: 'array',
    items: [
        { const: 'FOO' },
        { type: 'string' },
        { type: 'number' },
    ]
} as const;
// = readonly ["FOO", string, number]
type TypeDescribedByTuple1 = TypeDescribedBy<typeof tuple1>;
const tuple1Values: TypeDescribedByTuple1[] = [
    ['FOO', 'a string', 5],
    ['FOO', 'another string', 7],
];
```

Let's toss in something a bit more comprehensive:

```typescript
const logEntrySchema = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        timestamp: { type: 'string', format: 'date' },
        source: { enum: ['AWS', 'INFRA'] },
        severity: { enum: ['DEBUG', 'INFO', 'WARNING', 'ERROR'] },
        message: { type: 'string' },
    },
    required: ['id', 'timestamp', 'source', 'severity', 'message'],
} as const;
type LogEntryRecord = TypeDescribedBy<typeof LogEntrySchema>;
```

And the type is as expected:

```typescript
type LogEntryRecord = {
    id: number;
    timestamp: string;
    source: "AWS" | "INFRA";
    severity: "DEBUG" | "INFO" | "WARNING" | "ERROR";
    message: string;
}
```

Not really sure what to do about Datetime fields.  Maybe include a special provision for that?  Hm.

There's [three related formats](https://json-schema.org/latest/json-schema-validation.html#rfc.section.7.3.1) for date/time, `date`, `date-time`, and `time`.  JS doesn't really make a distinction, but any validation should.  Still, TS is focussed on JS, so type wise we can treat those all the same.

So, adding that as a condition before the basic string, you get this:

```typescript
type TypeDescribedByPrimitive<TSchema> =
    TSchema extends { type: 'string'; format: 'date' | 'date-time' | 'time' } ? Date :
    TSchema extends { type: 'string' } ? string :
    TSchema extends { type: 'number' | 'integer' } ? number :
    TSchema extends { type: 'boolean' } ? boolean :
    TSchema extends { type: 'null' } ? null :
    // not helpful?  describe your bloody object, then.
    TSchema extends { type: 'object' } ? object :
    TSchema extends { type: 'array' } ? unknown[] :
    // unrecognized type? probably invalid.
    never;
```

And that results in the following:

```typescript
type LogEntryRecord = {
    id: number;
    timestamp: Date;
    source: "AWS" | "INFRA";
    severity: "DEBUG" | "INFO" | "WARNING" | "ERROR";
    message: string;
};
```

Nice.  Dunno that there's anything else that would actually be not a string.


### Schema Combinators: allOf, anyOf, oneOf, not, if/then/else

I don't actually feel like doing these at this time, since they're not in my use case (yet?), but an idea of how each might work is given below.

- `allOf` is just an Intersection.
- `anyOf` is just a Union.
- `oneOf` is complicated, it means the input value must validate against _only one of_ the listed schemas, and not more than one.
    - The only way this sort of thing can work in TS is as a Union whose members are all obligately mutex.
        - The easiest way to do this is to have a single Sentinel Property, frequently named something like `type`.
        - Honestly, this same restriction also applies to the schemas, so I guess that's technically correct.
- `not` Seems like it might be odd at first, but really all it is is `Not<T, TType> = T extends TType ? never : T`.  More or less.
- `if`, `then`, and `else` can be done with the above combinators, but give a more succinct way to deduplicate things in certain cases.
    - Basically, if the input validates against the sub-schema at `if`, then the input must also validate against the sub-schema at `then` to validate against the whole schema.
    - However, if the input does _not_ validate against the sub-schema at `if`, then the input must validate against the sub-schema at `else` in order to validate against the whole schema.
    - This is basically the same as the `not` case, but without a `never` branch: `IfThenElse<TType, TIf, TThen, TElse> = TType extends TIf ? TIf & TThen : Not<TType, TIf> & TElse` or something like that.

`allOf`, `anyOf`, and `oneOf` would have to be implemented with some sort of recursive type on tuples, each recursion expanding out the intersection.  Pretty sure it's possible, but I don't feel like doing that here.


### JSON Refs?

I'm not even sure what to do about this, yet.  Anything?  Nothing?  Leave it to the OpenAPI Doc?

I'll put it off for now.



## Fluid Schema Builder

Now that we can derive a Type from a Schema Const-Type, I guess we should make a fluid schema builder that results in a schema with a const-enough type.  Unlike [a previous one I sketched out](../Javascript/Journal%202019-07-28%20-%20Simple%20Object%20Builder.md), I'll keep this one strictly a wrappery affair, not adjusting the object itself.  Makes the API a bit easier to handle.

There's a few schema builders out there, [this one's pretty slick](https://github.com/atomiqio/json-schema-builder) for instance.  Is it hard to build one?  I mean, as I showed before, not really, it's just a bunch of convenience methods to build an object, though obviously with JSON Schema there's some cases that are semantically meaningful that can be wrapped up quite nice.

The main issue as noted above is one that builds a schema with a const-enough type.  Is there a way to this without getting a huge intersection mess?  Does it even matter?  Probably not, really.

The schema itself only needs to be itself.  The type created from it, though, that needs to be mostly readable.

```typescript
enum SchemaType {
    object = 'object',
    array = 'array',
    string = 'string',
    number = 'number',
    integer = 'integer',
    boolean = 'boolean',
    null = 'null',
};

enum SchemaFormat {
    dateTime = 'date-time',
    date = 'date',
    time = 'time',
    email = 'email',
    idnEmail = 'idn-email',
    hostname = 'hostname',
    idnHostname = 'idn-hostname',
    ipv4 = 'ipv4',
    ipv6 = 'ipv6',
    uri = 'uri',
    uriReference = 'uri-reference',
    iri = 'iri',
    iriReference = 'iri-reference',
    uriTemplate = 'uri-template',
    jsonPointer = 'json-pointer',
    relativeJsonPointer = 'relative-json-pointer',
    regex = 'regex',
};

class Schema<TSchema extends object = {}> {
    protected $schema: TSchema = {} as TSchema;

    /**
     * called by JSON.stringify().
     */
    public toJSON() {
        return this.$schema;
    }

    /**
     * The schema built by this wrapper as a POJO.
     * All instances of Schema builders will also be
     * converted into POJOs.
     */
    public get schema() {
        return JSON.parse(JSON.stringify(this.$schema)) as TSchema;
    }

    public type<TType extends SchemaType>(t: TType) {
        const next = this as Schema<TSchema & { type: TType }>;
        next.$schema.type = t;
        return next;
    }

    public object() {
        return this.type(SchemaType.object);
    }
    public array() {
        return this.type(SchemaType.array);
    }
    public string() {
        return this.type(SchemaType.string);
    }
    public number() {
        return this.type(SchemaType.number);
    }
    public integer() {
        return this.type(SchemaType.integer);
    }
    public boolean() {
        return this.type(SchemaType.boolean);
    }
    public null() {
        return this.type(SchemaType.null);
    }

    public format<TFormat extends SchemaFormat>(f: TFormat) {
        const next = this as Schema<TSchema & { format: TFormat }>;
        next.$schema.format = f;
        return next;
    }

    public properties<TProps extends { [k: string]: Schema }>(props: TProps) {
        const next = this as Schema<TSchema & {
            properties: {
                [K in keyof TProps]: TProps[K] extends Schema<infer TSubSchema>
                    ? TSubSchema
                    : never;
            };
        }>;
        // aww yiss let's lie about everything that won't come back to bite us.
        // what should probably be done is to leave TSchema actually truthful
        // and make a flattener, but that's kinda tricky.
        next.$schema.properties = props as any;
        return next;
    }
}

const schema = {
    get type() { return new Schema().type; },

    get object() { return new Schema().object; },
    get array() { return new Schema().array; },
    get string() { return new Schema().string; },
    get number() { return new Schema().number; },
    get integer() { return new Schema().integer; },
    get boolean() { return new Schema().boolean; },
    get null() { return new Schema().null; },

    get format() { return new Schema().format; },
};
```

That's simple enough, but what about `properties`?  `items`?

Hmm.

```typescript
const s1 = schema.object()
.requiredProperties({
    foo: schema.string(),
    bar: schema.string(),
})
.properties({
    baz: schema.number(),
});
```

How's that compare to prop-by-prop?  That's probably less annoying, really.

```typescript
const s1 = schema.object()
.requiredProperty('foo', schema.string())
.requiredProperty('bar', schema.string())
.property('baz', schema.number())
;
```

Formatted that way, it's shorter linewise, but longer on each line.  Total bytes obviously is up.  I'll probably just go with object-form because eh.  Easier for people coming in.

As far as `.properties()`, `.required()`, well, this is a thing you can do:

```typescript
type R<T> = {
    // the "-?" removes the optionalness, in much the same way
    // "-readonly" removes readonlyness.
    [K in keyof T]-?: T[K];
};
```

So, first thought for just `properties` itself is this:

```typescript
class Schema<TSchema extends object = {}> {
    public properties<TProps extends { [k: string]: Schema }>(props: TProps) {
        const next = this as Schema<TSchema & {
            properties: {
                [K in keyof TProps]: TProps[K] extends Schema<infer TSubSchema>
                    ? TSubSchema
                    : never;
            };
        }>;
        // aww yiss let's lie about everything that won't come back to bite us.
        // what should probably be done is to leave TSchema actually truthful
        // and make a flattener, but that's kinda tricky.
        next.$schema.properties = props as any;
        return next;
    }
}
```

Still not sure which option to take.  I'll have to see if writing a flattener is easy.  If so, I can remove the very shifty cast in there and just use the flattener.  Recursive types are fun, though... Bleh.

Okay, so `required`?

```typescript
class Schema<TSchema extends object = {}> {
    public required<TNames extends string[]>(...names: TNames) {
        const next = this as Schema<TSchema & { required: TNames; }>;
        next.$schema.required = names;
        return next;
    }
}
```

Bah, forgot about array literals vs function arguments for a bit.  Have to use restargs in order to get automatic "tuple" behavior, otherwise I'd have to pass in `[...] as const` all the time, and that's just rubbish.

Now, obviously, using those two methods separately is easy... but can we combine them in one?  Can we also call at least `properties` multiple times?

```typescript
type PropIntersection = { foo: { foo: string } } & { foo: { bar: number } };
const propIntersection: PropIntersection = { foo: { foo: 'string!', bar: 3 } };
```

Yep.  However, what you can't really do is merge `required` calls, that's just not gonna happen based on what I tried with tuples in the Schema-Type stuff.

Anyway, based on that last example there it turns the current behavior will produce a correct (more or less) type, but incorrect behavior.  Lying already!

```typescript
class Schema<TSchema extends object = {}> {
    public properties<TProps extends { [k: string]: Schema }>(props: TProps) {
        // aww yiss let's lie about everything that won't come back to bite us.
        // what should probably be done is to leave TSchema actually truthful
        // and make a flattener, but that's kinda tricky.
        const next = this as Schema<TSchema & {
            properties: {
                [K in keyof TProps]: TProps[K] extends Schema<infer TSubSchema>
                    ? TSubSchema
                    : never;
            };
        }>;
        // replace this line:
        // next.$schema.properties = props as any;
        // with this:
        next.$schema.properties = Object.assign(next.$schema.properties || {}, props as any);
        return next;
    }
}
```

The upshot is that `requiredProperties` is kinda to make... in principle

```typescript
class Schema<TSchema extends object = {}> {
    public requiredProperties<TProps extends { [k: string]: Schema }>(props: TProps) {
        // aww yiss let's lie about everything that won't come back to bite us.
        // what should probably be done is to leave TSchema actually truthful
        // and make a flattener, but that's kinda tricky.
        const next = this as Schema<Omit<TSchema, 'required'> & {
            properties: {
                [K in keyof TProps]: TProps[K] extends Schema<infer TSubSchema>
                    ? TSubSchema
                    : never;
            };
            required: Array<keyof TProps>;
        }>;
        next.$schema.properties = Object.assign(next.$schema.properties || {}, props as any);
        next.$schema.required = Object.keys(props);
        return next;
    }
}
```

ssssssooooorta close.  Unfortunately, since `Object.keys()` isn't technically deterministic when it comes to order, the best we get from this syntax is `Array<"foo" | "bar" | ...>`.  Now, it's not the best type in the world, but `TypeDescribedBy<T>` actually does handle it as expected.

Could we go better?  ~~We could, yes~~ Maybe, but it'd be noisy.

```typescript
const s7 = schema.object().requiredProps(
    ['foo', schema.number()] as const,
    ['bar', schema.string()] as const,
);

class Schema<TSchema extends object = {}> {
    public requiredPropertiesTuple<
        TProps extends Array<[string, Schema]
    >(...props: TProps) {
        type TRequired = {
            [K in keyof TProps]: TProps[K] extends [infer TKey]
                ? TKey extends string
                    ? TKey
                : never
            : never;
        };
        type TProperties = {
            // eeeh, this isn't quite right...
            [K in keyof TProps]: TProps[K] extends [any, Schema<infer TSubSchema>]
                ? TSubSchema
                : never;
        };
        const next = this as Schema<TSchema & {
            properties: TProperties;
            required: TRequired;
        }>;
        next.$schema.properties = Object.assign(
            next.$schema.properties || {},
            props.reduce((acc, [k, v]) => (acc[k] = v, acc), {} as TProperties)
        );
        next.$schema.required = props.map(kv => kv[0]) as TRequired;
        return next;
    }
}
```

Okay, yeah, that's not really right.  Time to go to bed, I think.

#### Continuing As If There's a Flattener

So, the Flattener's not really that scary, so I'll forage on ahead.

If I pretend one exists, then I can vastly simplify the methods themselves:

```typescript
class Schema<TSchema extends object = {}> {
    public properties<TProps extends { [k: string]: Schema }>(props: TProps) {
        const next = this as Schema<TSchema & {
            properties: {
                [K in keyof TProps]: TProps[K];
            };
        }>;
        next.$schema.properties = Object.assign(next.$schema.properties || {}, props as any);
        return next;
    }

    public required<TNames extends string[]>(...names: TNames) {
        const next = this as Schema<TSchema & { required: TNames; }>;
        next.$schema.required = names;
        return next;
    }

    public requiredProperties<TProps extends { [k: string]: Schema }>(props: TProps) {
        return this.properties(props).required(...(Object.keys(props) as Array<Extract<keyof TProps, string>>));
    }
}
```

Still has the above problem about getting arrays of unions for Required rather than a tuple, but oh well.

#### Next: Items

This one will require actually distinguishing between the two different behaviors at the method level, because I want to keep the number of `as const` in normal use as low as possible.  That means:

- `tupleItems(...schemas)` defines `items` as a Tuple of Schemas.
- `listItems(schema)` defines `items` as a List-Item Schema.


### The Flattener?

There's only a few places where we actually need to look at flattening:

- `properties` only one behavior.
- `items` polymorphic.

Shouldn't actually be that hard, then.

```typescript
type PlainSchemaType<T> = {
    [K in keyof T]:
        K extends 'properties' ? T[K] extends object ? {
            [PK in keyof T[K]]: T[K][PK] extends Schema<infer TSub>
                ? PlainSchemaType<TSub>
                : T[K][PK];
        } : T[K] :
        K extends 'items' ? (
            T[K] extends Schema<infer TListItemSchema> ?
                PlainSchemaType<TListItemSchema>
            : T[K] extends Array<Schema> ? {
                [TK in keyof T[K]]: T[K][TK] extends Schema<infer TSub> ? PlainSchemaType<TSub> : never;
            } : never
        ) :
        T[K]
    ;
};
```

Test case:

```typescript
const sp1 = schema.object().properties({
    obj: schema.object().properties({
        foo: schema.string(),
        bar: schema.number(),
    }).required('foo'),
});
```
