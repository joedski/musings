Notes For People Starting Out in TypeScript
========

> An attempt at some notes for people just starting out.  Hopefully they're understandable.

> As a general piece of advice, for the most part you don't need to be clever with the type system.  If you think you do, there's usually a simpler way to architect your code to remove the need for that cleverness.



## To Start With...

- Make sure you've gone through [the 5 Minute Tutorial](http://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html).
- Remember that if you've never worked in TypeScript before, it's going to be annoying and slow at first.  You'll get better.
- Always think in Shapes, not Names.
- The best code is no code.
- For the most part you don't need to be clever with the type system.  If you think you do, there's usually a simpler way to architect your code to remove the need for that cleverness.



## Writing the Types: Type Annotations

When you write the Type of a variable, function parameter, function return value, and so on, you're writing a Type Annotation.  For the most part, annotations are started with a Colon `:` followed by the Type.

For example, suppose we have a type `FooType`:

> TODO: Separate Functions out into their own section because they're a whole nother can of worms.

```typescript
// Annotating a var, const, or let.
let foo: FooType;
// Compare this to an un-annotated let:
let foo2;

// Annotating a let with an object-literal type,
// with a property "objProp" that has type "FooType".
let obj: { objProp: FooType; };

// Annotating a function's parameter "a" as "FooType",
// and annotating the function's return type as "FooType".
function doThing(a: FooType): FooType {
    // ...
}
// Compare this to a function with to param annotations:
function doThing2(a): FooType {
    // ...
}
// ... or to a function with no return-type annotation:
function doThing3(a: FooType) {
    // ...
}

// Annotating a const as a Function.
// Notice how the function-type annotation itself uses Arrow Function Syntax.
const fooFunc: (a: FooType) => FooType = doThing;

// Annotating a const as an Array of FooType.
const fooArr: FooType[] = [];
// Exact same thing, but more verbose.
const fooArr2: Array<FooType> = [];
```



## TypeScript Is Structural: Think in Shapes, not Names

In TypeScript, a Type is defined not by the name given to it, but by the shape that it represents.  If two types are [compatible in shape](http://www.typescriptlang.org/docs/handbook/type-compatibility.html), it doesn't matter what they're being called at the moment, they're considered compatible.

What's meant by shape, though?

For primitive values, the shape is just a simple type: `number`, `boolean`, `null`, etc.  They don't really have a shape beyond that itself.  `5` is a `number`, `true` is a `boolean`, `null` is `null`, so on, so forth.

> Aside: For numbers, remember that `Infinity`, `-Infinity`, and `NaN` are all `number`s too!  You won't encounter them most of the time, though.  If you really think you'll encounter them you can check for them with `Number.isFinite()`.

For non-primitive values, though, shape gets a little more complex: there are Objects, Arrays, Tuples which are somewhat related to Arrays, and Functions.  Objects are usually defined by a set of properties, Arrays by the shape of the elements inside them, Tuples by the shape of each element at each given position, and Functions by the set of Parameters and the Return Type.


### Object Shapes: Interfaces vs Types

It should be noted that you can define Object Shapes in two ways: With [Interfaces](http://www.typescriptlang.org/docs/handbook/interfaces.html) and Types.  While there are merits to both ways of defining an Object Shape, usually you're going to want to use an Interface for the simple reasons that Classes can always implement Interfaces, and that Interfaces can always extend other Interfaces.

That aside, you shouldn't need to worry about the esoteric differences while starting out.

#### Special Case: Function Interfaces and Constructable Interfaces

Unlike in a language such as Java where an Interface is always about Members, TypeScript Interfaces can also describe Functions.

```typescript
interface NumberPredicate {
    (n: number): boolean;
}

// True Fact: Numbers bigger than or equal to 7 are scary.
const isBigAndScary: NumberPredicate = (n: number) => n >= 7;

// You can also return functions, of course.
const isBiggerThan: (n: number) => NumberPredicate =
    (comparand: number) => (n: number) => n > comparand;

const isBiggerThan5 = isBiggerThan(5);
```

In a much less common case, you can also use similar syntax to talk about constructable things, which is to say Classes:

```typescript
interface FrangibleContext {
    foo: string;
    bar: number;
}

// We can accept any _class_ whose constructor
// follows the given interface.
interface FrangibleClass {
    // NOTE: no return type!
    new(context: FrangibleContext);
}

class Foo {
    constructor(protected context: FrangibleContext) {}
}

class Bar {
    constructor(protected context: FrangibleContext) {}
}

const things: FrangibleClass[] = [Foo, Bar];
```

Note that this is different from an Interface that a Class implements.  Such interfaces are not concerned with the statics of the Class, rather implemented Interfares are concerned with the instances of the Class.

For a broader overview, take a look at [the TypeScript Handbook on Class Interfaces](http://www.typescriptlang.org/docs/handbook/interfaces.html#class-types).


### Classes: Still Structural!

Classes in TypeScript aren't given any special treatment when it comes to the structural typing thing.  Remember that when you do `instanceof` on an instance, you're just saying "This instance has this class somewhere in its prototype chain", which as far as TypeScript is concerned just means "This instance fits the same shape as the target class".

Also remember that in JavaScript, Classes are (mostly) just Functions with a Prototype: They're concrete values just like anything else.

As an example, some classes with no properties or methods.  Strictly speaking, instances aren't of the same class, but practically speaking, instances all have the same shape.  The only difference: They'll fail each others' `instanceof` checks.

```typescript
class Foo {}

class Bar {}

// No type errors!
const _foo0: Foo = new Bar();
const _bar0: Bar = new Foo();
```

As another example, even though Bar doesn't have Foo in the prototype chain, as long as Bar's shape covers all of Foo's shape you can assign a Bar instance to a variable typed as a Foo.

```typescript
class Foo {
  constructor(
    public foo: string
  ) {}
}

class Bar {
  constructor(
    public bar: number,
    public foo: string
  ) {}
}


const _foo0: Foo = new Foo('foo!');

// No type error!
const _foo1: Foo = new Bar(42, 'bar!');
```

You can even do this with methods:

```typescript
class Foo {
  constructor(
    public foo: string
  ) {}

  grump(target: string) {
    return `${this.foo}y on ${target}y!`;
  }
}

class Bar {
  constructor(
    public bar: number,
    public foo: string
  ) { }

  grump(target: string) {
    return `A pox of ${this.bar} ${this.foo}${this.bar === 0 ? '' : 's'} upon ${target}!`;
  }
}


const _foo0: Foo = new Foo('foo');
console.log(_foo0.grump('Skeletor'));

const _foo1: Foo = new Bar(42, 'bar');
console.log(_foo1.grump('Skeletor'));
```
