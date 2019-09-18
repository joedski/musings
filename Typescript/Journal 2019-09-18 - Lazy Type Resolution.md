Journal 2019-09-18 - Lazy Type Resolution
========

In general, TS tries to be as eager as possible when resolving types, but there are times where you may want to implement circular or nested types.  For example, a generic JSON type, or a type that could be some other type or an arbitrarily deeply nested array of that other type.

The issue one runs into when trying to do this, though, is that TS forbids a type from referencing itself, because that would make eager resolution die.  The escape hatch here is that some type mechanisms in TS are _lazy_ rather than eager.

1. [Comment noting that interface members and interface base-types are lazily resolved, while type aliases are eagerly resolved](https://github.com/Microsoft/TypeScript/issues/3496#issuecomment-128553540)
    - In my research, mapped types are also lazily evaluated.
    - Of course, indexing into an interface or mapped type is eager, so be careful there.

So, to wit then, that gives us:

- Interface members, including inline-interfaces in Type Aliases
- Interface base-types
- Mapped-type elements

Not the most expansive, but usable enough for many cases.



## Examples


### Linked Lists

```typescript
interface ListElement<T> {
    value: T;
    next?: ListElement<T>;
}

const ll0: LinkedList<string> = {
  value: 'foo',
};
const ll1: LinkedList<string> = {
  value: 'bar',
  next: ll0,
};
const ll2: LinkedList<string> = {
  value: 'baz',
  next: ll1,
};
```

However, if you want to make things more brackety, you can do this:

```typescript
interface LinkedList<T> extends Array<T | LinkedList<T> | void> {
  0: T;
  1?: LinkedList<T>;
  length: 1 | 2;
}

const ll0: LinkedList<string> = ['foo'];
// you can put in undefined if you want, but you shouldn't.
const ll1: LinkedList<string> = ['foo', undefined];
const ll2: LinkedList<string> = ['foo', ['bar', ['baz']]];
```

While we can't control every element, we can control the `length` prop, thereby restricting the point of use from adding more elements.


### A JSONValue Type

From [the first source](https://github.com/Microsoft/TypeScript/issues/3496#issuecomment-128553540), a JSONValue type:

```typescript
type JSONValue = string | number | boolean | JSONObject | JSONArray;

// OK: Interface member is lazily resolved.
interface JSONObject {
    [x: string]: JSONValue;
}

// OK: Interface base-type is lazily resolved.
interface JSONArray extends Array<JSONValue> {}
```


### Arbitrarily-Deeply Nested Arrays of Type

```typescript
/**
 * Array of a type union of a type or an arbitrarily-deeply nested
 * array of that Type itself or arrays thereof.
 *
 * Like this:
 * 
 *     type C<T> = (T | (T | (T...)[])[])[];
 */
export interface DeepArrayOf<T> extends Array<T | DeepArrayOf<T>> {}

/**
 * A type union of a given Type itself or an arbitrarily-deeply nested
 * array of that Type itself or arrays thereof.
 * 
 * Like this:
 * 
 *     type C<T> = T | (T | (T | (T...)[])[])[];
 * 
 * but not running afoul of immediate-circular-reference errors in TS.
 */
export type TypeOrDeepArrayOf<T> = T | DeepArrayOf<T>;
```

I'm not sure of how many places where this might be used, but one place is for typing the input argument of [a `classnames` function](https://www.npmjs.com/package/classnames):

```typescript
type AnyClassnames = TypeOrDeepArrayOf<
    | string
    | Record<string, boolean>
    | boolean
    | null
    | void
    // probably a few others...
>;
```
