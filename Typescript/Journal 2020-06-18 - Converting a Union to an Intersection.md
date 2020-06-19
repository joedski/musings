Journal 2020-06-18 - Converting a Union to an Intersection
========

From [this answer by jcalz](https://stackoverflow.com/a/50375286), we get this "evil magic":

```typescript
type UnionToIntersection<U> =
  (U extends any ? (k: U)=>void : never) extends ((k: infer I)=>void) ? I : never;
```

> That distributes the union U and repackages it into a new union where all the consitutents are in contravariant position. That allows the type to be inferred as an intersection I, as mentioned in the handbook:
>
> > Likewise, multiple candidates for the same type variable in contra-variant positions causes an intersection type to be inferred.

The whole distribution over unions thing has always been a bit of a weird but useful thing to me.  Here's a specific example of what's happening, though:

```typescript
interface Foo { foo: string }
interface Bar { bar: number }

// If we do not distribute U via conditional type...
// :: Foo | Bar
type TUnion = ((fooOrBar: Foo | Bar) => void) extends ((a: infer A) => void) ? A : never;

// If we do distribute U via conditional type...
// :: Foo & Bar
type TIntersection = (((foo: Foo) => void) | ((bar: Bar) => void)) extends ((a: infer A) => void) ? A : never;
```

In the first case, the argument of the function itself has the type union, so there's really _only one function type_.

In the second case however, we have a _union of two different function types_, which is what happens when that distribution of unions thing occurs in that conditional type.  (That `U extends any ? (k: U) => void : never` thing part, because `U` is a bare type parameter.)  Because of that, if TS wants to infer a type for `I`, it must make sure `I` covers all argument types of the different members of the function union.  Since, when discussing classes of functions, [they are contravariant in their arguments](https://stackoverflow.com/a/38577878), TS must infer an intersection here.

Put plainly, the only way to infer a type `I` that covers the first argument of type `((foo: Foo) => void) | ((bar: Bar) => void)` is to ensure `I` is assignable to both `Foo` _and_ `Bar`, thus `Foo & Bar`.



## Practical Applications


### Validated Type from List of Predicates

Suppose we have something like this:

```typescript
function hasProp<K extends string, P>(key: K, propIs: (p: unknown) => p is P) {
  return function targetHasProp(target: unknown): target is { [Ks in K]: P } {
    if (typeof target !== 'object') return false;
    if (target == null) return false;

    const targetWithMaybeK: object & { [Ks in K]?: unknown } = target;

    if (key in targetWithMaybeK) {
      const prop = targetWithMaybeK[key];
      if (propIs(prop)) {
        return true;
      }
    }

    return false;
  }
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

const propFooIsString = hasProp('foo', isString);
const propBarIsString = hasProp('bar', isString);

const vs = [
  propFooIsString,
  propBarIsString,
];
```

What should be the result of validating some value against all of the items in `vs`?  In this case, it seems like it should be `{ foo: string } & { bar: string }`, right?  That's what we want, anyway.

If we just naively try extracting the predicated types though, we get a union:

```typescript
type Vs = typeof vs;
type PredicateTypes<Ps> = Ps extends (v: any) => v is infer R ? R : never;

// :: { foo: string } | { bar: string }
type VRets = PredicateTypes<Vs[number]>;
```

While that is descriptive of what we have, it's not what we want.  So, we need `UnionToIntersection`:

```typescript
type PredicatesResult<Ps> = UnionToIntersection<PredicateTypes<Ps>>;

// :: { foo: string } & { bar: string }
type VRes = PredicatesResult<Vs[number]>;
```
