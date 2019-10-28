Journal 2019-10-25 - Empty Array Literals and Function Arguments
========

Something I've noticed when dealing with type parameters and functions is empty array literals have a bit of quirky behavior: when no extra type information is present, they receive a type `never[]`.

Take for example:

```typescript
// any[]
const emptyArr = [];

function value<T>(v: T): T { return v; }
// never[]
const emptyArr2 = value([]);
```

Interesting to note: assigned directly to a value, they're merely `any[]`, presumably because when so assigned they could be mutated afterwards.  When passed as a function argument, though, they end up with `never[]`, I guess because they're not going to be changed by the code that created them.

Natuarlly, this only happens when TS has to infer a type for it.



## Case Study: Safe Accessor

Here's a basic example that illustrates the main case where this behavior can be problematic:

```typescript
class Maybe<T> {
    constructor(
        protected $: ['None'] | ['Just', T]
    ) { }

    public getOr<U>(elseValue: U): T | U {
        if (this.$[0] === 'Just') {
            return this.$[1];
        }
        return elseValue;
    }
}

const maybe0: Maybe<string[]> = new Maybe(['Just', ['foo', 'bar']]);

// Call type ends up as:
//   Maybe<string[]>.getOr<never[]>(elseValue: never[]): string[] | never[]
// Value type thus is: string[] | never[]
const v0 = maybe0.getOr([]);
```

The type `U` in `getOr<U>` of course must be free to take on any value, since the implementation should not presume to know what sort of else-value is actually useful in every given context.  But, this runs afoul of the above described behavior, giving us that annoying `never[]`.

Maybe (heh!) this can be solved with an overload?

```typescript
class Maybe<T> {
    constructor(
        protected $: ['None'] | ['Just', T]
    ) { }

    public getOr(elseValue: T): T;
    public getOr<U>(elseValue: U): T | U;
    public getOr<U>(elseValue: U): T | U {
        if (this.$[0] === 'Just') {
            return this.$[1];
        }
        return elseValue;
    }
}

const maybe0: Maybe<string[]> = new Maybe(['Just', ['foo', 'bar']]);

// Call type ends up as:
//   Maybe<string[]>.getOr(elseValue: string[]): string[]
// Value type thus is: string[]
const v0 = maybe0.getOr([]);

// Call type ends up as expected:
//   Maybe<string[]>.getOr<null>(elseValue: null): string[] | null
// Value type thus is: string[] | null
const v1 = maybe0.getOr(null);
```

The last case has to be repeated due to how TS actually uses overloads.  But, this does work as desired.  Excellent.
