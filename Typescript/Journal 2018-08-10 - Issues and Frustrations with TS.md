Journal 2018-08-10 - Issues and Frustrations with TS
====================================================

It might be worth trying to articulate frustrations I face trying to use TS.



## Disorganized Thoughts

It's impossible to start a mess of spaghetti, to pull articulation from the morass of meh, so rather than trying to do that, I'm just going to start with jotting down whatever I can articulate and start organizing things from there.


### On Hitting the Current Limitations of TypeScript Tooling

To quote a coworker:

> Your problems with TS are among a few that I've heard from the edges of what is basically functional programming in JS. It's Haskell-level in its interestingness. I've also been puzzled why Flow exists with TypeScript being so popular, but I think I'm beginning to understand. As TS grows, its type theory is beginning to chafe against what I think can best be described as Hindley-Milner typing in JS and React. That statement is at the absolute limits of my knowledge, though, so I'm not completely confident in it. The fact that Flow was built in OCaml, a language heavily used for compiler building, reveals the esoteric work going on with the React team. Even though I think TS is more pragmatic, Flow is much more visionary.

This is after relating to the team my frustrations at running into non-assignability errors and TSServer crashes from exceeding the maximum stack size.

I think there's truth to their supposition that I'm trying to treat TS as perhaps both more dynamic in type defining than it's currently capable of and more constrainable than the implementation of TSServer (as of writing, 2018-08-13) can handle.  I'm looking at things like Elm, OCaml, Haskell, and Purescript, among many others, and wanting to do that.  I want TS (and really, JS) to be something else.

One thing I do like in TS over Flow: Mapped Object Types.

One thing I run into frustrating limitations of: Mapped Object types.

#### On Different Degrees of Typing

I think there are at least 3 main degrees of typing here:
- **Similar in Shape Only**
  - Here, all that's really known is that the two types are mapped types.  They have different and assumed-to-be entirely unrelated value types.
  - EG `type Foo = { [k: string]: FooProp }` and `type Bar = { [k: string]: BarProp }`
- **Similar in Keys**
  - `type Foo<T> = { [K in Extract<keyof T, string>]: FooProp<T[K]> }`
  - `type Bar<T> = { [K in Extract<keyof T, string>]: BarProp<T[K]> }`
- **Derived**
  - Not so much a separate degree, I suppose, but trying to transform from `Foo<T>` to `Bar<T>`.
  - `type BarOfFoo<T> = { [K in Extract<keyof T, string>]: BarPrpoOfFooProp<T[K]> }`

#### Non-Assignability Frustrations

Over all, these seem to be mostly due to trying to solve the general-most cases rather than dealing with specific instances.

There seemed to be a few things causing these
- **Overconstraining of Type Parameters**
  - With a few more general exceptions, I probably didn't need to add any constraints to the type params of conditional types.
- **Constraining of Type Parameters in one place without doing so somewhere else**
  - This lead to some things being under constrained then getting wedged into places where tighter constraints had to be met, and TS not being able to guarantee that.
  - This is more of a developer problem than a TS problem, since it makes sense on stepping back.  TS's errors don't make it easy to figure out when writing in anger, though, which is why stepping back and taking a walk is important.
- **Keys of Derived Mapped Types**
  - It seems anyway that even if in the concrete, the keys-union of one map-type do equal the keys-union of another, in the abstract TS often says things like `Extract<keyof TFoo, string> cannot be used to index TBar` even though `TBar` was created from `BarOf<T> = { [K in Extract<keyof foo, string>]: ... }` using `TBar = BarOf<TFoo>`.
  - Trying to do `bar[propName as Extract<keyof TBar, string>] = barPropOfFooProp(foo[propName])` also fails because, again, `propName: Extract<keyof TFoo, string>` cannot be converted to `Extract<keyof TBar, string>`.

#### On Stack Size Limitations in TSServer

I ran into tsserver.log entries like this part way through any attempt to describe the config types and derivative types:

```
Err 943   [9:2:5.336] Exception on executing command delayed processing of request 142:

    Maximum call stack size exceeded

    RangeError: Maximum call stack size exceeded
    at Map.get (native)
    at getIndexedAccessType (/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/node_modules/typescript/lib/tsserver.js:29973:47)
    at instantiateType (/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/node_modules/typescript/lib/tsserver.js:30764:28)
    at /Applications/Visual Studio Code.app/Contents/Resources/app/extensions/node_modules/typescript/lib/tsserver.js:30532:42
    at Object.map (/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/node_modules/typescript/lib/tsserver.js:1745:29)
    at getConditionalTypeInstantiation (/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/node_modules/typescript/lib/tsserver.js:30709:40)
    at instantiateType (/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/node_modules/typescript/lib/tsserver.js:30767:28)
    at instantiateList (/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/node_modules/typescript/lib/tsserver.js:30472:34)
    at instantiateTypes (/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/node_modules/typescript/lib/tsserver.js:30486:20)
    at instantiateType (/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/node_modules/typescript/lib/tsserver.js:30757:36)
    at /Applications/Visual Studio Code.app/Contents/Resources/app/extensions/node_modules/typescript/lib/tsserver.js:30532:42
    at Object.map (/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/node_modules/typescript/lib/tsserver.js:1745:29)
    at getConditionalTypeInstantiation (/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/node_modules/typescript/lib/tsserver.js:30709:40)
    at getConstraintOfDistributiveConditionalType (/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/node_modules/typescript/lib/tsserver.js:28178:40)
    at getConstraintOfConditionalType (/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/node_modules/typescript/lib/tsserver.js:28187:20)
    at computeBaseConstraint (/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/node_modules/typescript/lib/tsserver.js:28294:38)
    at getBaseConstraint (/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/node_modules/typescript/lib/tsserver.js:28256:30)
    at computeBaseConstraint (/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/node_modules/typescript/lib/tsserver.js:28275:40)
    at getBaseConstraint (/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/node_modules/typescript/lib/tsserver.js:28256:30)
    at computeBaseConstraint (/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/node_modules/typescript/lib/tsserver.js:28295:42)
    (... last 4 lines repeated 20 more times)
```

This was in part likely due to having a config that allowed two different shapes for each prop: a function or an object.  This meant for any derived type, I had to make conditions checking if the base type extended some other type, with much inferrence from there.

As they say, this kills the crab.  I mean server.

I like to think that my cases wasn't that complex, but apparently it was, so.  Byeh.

Why was this killer?  Hm.  Well, here's what I wanted to do:
- Given a base config, whose props could be one of two shapes...
  - Create a normalized config whose props are the same as the props of the base config, but only of one shape.
  - Create a props type which has...
    - Props that are functions, one for each base config prop.
    - Props that are values, one for each base config prop.

The precomposition of React-Redux's `connect` on `withAsyncData` also cause some additional derivations:
- A `mapDispatchToProps` function which had as its return type props derived from the dispatch-aware config.
- A derivation of a base config from that dispatch-aware config.

At the very least, that's 5 derivations, some of which are 2 layers deep coming from the precomposition.


### On Accomplishing Derivative Mapped Types and Prop-Internal Coherency

> I'm also starting to feel somewhat like the only way to do what I was trying to do in TS (mapped object types with props that are internally consistent and derived mapped object types with similar constraints) would be with functions and/or classes.  Even then I'm not actually sure it'd be doable without ultimately running into the same things before or just trusting things.  I'm pretty sure the "just trusting things" case would actually lose type derivation for the injected props, which is ultimately the most useful part.

To which a coworker said:

> ... the "just trusting things" problem is what I'm seeing a lot of with TS. It is a common go-to solution for complex TS applications, which means that TS deployments out there are filled with code that are actually a mish-mash of typed and non-typed code, which means we have added complexity for the same problem as before: lack of confidence.

This is why people make things like Bucklescript/jsofocaml, Elm, Purescript, etc.  Bleh.

On using classes: Let's make JS Java again!  (ActionScript 4 did it first!  (And probably not actually first.))


### On Constraints and Conditional Types

You can't do `T extends SomeShape<T>` if `SomeShape<T>` is a conditional type, since that's a circular constraint.  Annoying, even if expected.  Or perhaps it's not really expected.  Eh.  Still something I ran into repeatedly.

I'll grant, though, that if that's happening, that's probably a sign you need to use only one or the other since both is actually kind a silly, anyway.
