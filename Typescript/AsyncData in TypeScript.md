AsyncData in Typescript
=======================

I wanted to do the equivalent of [this pattern](https://medium.com/javascript-inside/slaying-a-ui-antipattern-in-react-64a3b98242c) in a Typescript project, but [daggy](https://github.com/fantasyland/daggy) doesn't have Typescript types, and honestly I'm not sure how to strongly specify how it would work.  Lots of `keysof` and such, but the biggest thing is I don't know how to take a tuple of strings and use that to specify object properties, which is one of the main parts of daggy's interface.

Since I need this sooner than later, I'll just try implementing a bespoke thing.



## Try 1: Objects and Functions

My first thought is to just use objects and functions, because they are clearly superior to classes.  The [implementation I came up with](./AsyncData%20in%20TypeScript%20Examples/objects-and-functions.ts) was noisier, though, so in this case my assertion of superiority was not so correct.



## Try 2: Classes

I'm nothing if not pragmatic.  I figured there must be an easier way to do it.  The tagged types in daggy are basically subclasses of the sum type, so I figured I could engage in some "class extends base" work.  The [implementation I came up with using classes](./AsyncData%20in%20TypeScript%20Examples/classes.ts) came out much cleaner than the other one.  Oh well.

It also allows method-chaining, which is okay, but not as nice as plain function composition or flowing.  Oh well, it's JS not OCaml.  Shame we don't have an official bind operator, nor a pipe operator.

For the most common case, we get a very javascripty look:

```js
enhancedFetch(apiRequests.thingy(thingyId))
  .then(res => res
    .map(data => notify({
      ...
    }))
    .mapError(error => {
      const message = (() => {
        if (error instanceof Response) {
          return 'Some server error';
        }
        if (error instanceof Error) {
          return error.message;
        }
        return 'Some unknown error';
      })();

      notify({
        ...
      });
    })
  );
```



## Try 3: Classes with Abstract Methods

The idea behind this is to avoid reliance on `instanceof`, which is easily fooled.  I doubt it would be fooled in this limited case since, if you're doing tricky things, you're shooting yourself in the foot, but hey, I need to explore the possibility.

Basically, instead of having the cases all shown in the base method implementations, any methods dependent on the concrete class of the instance should have their specific behavior implemented in those derivative concrete classes.  This gives us two things:
- Specific behavior defined at the most meaningful point, at the cost of having it spread across definitions.
- No need to manually throw errors to avoid non-exhaustive checks.  Instead, the use of abstract methods will do that for us, whether by not even implementing something or by having an error-throwinwg-method automatically created.

The primary downside of this is that we have to duplicate the method type definitions for every implementation.  Very annoying.  Technically correct, but very verbose.  Not sure if that's fine or not, it does make it harder to read and update, though.



## Other Thoughts


### Run-Time Type Checking

Neither implementation includes the ability to check types separately and, for the use cases I'm considering, I don't think that's really necessary.  Every case is better handled with `inst.cata()`.  (Except those better handled with `.map()` because you only need to change the success case.)

On the other hand, if I just attached the class constructors directly to `AsyncData`, then I could just define `is` on them directly, or users could just use `instanceof` to check if the types are as described.


### The Component Enhancer

This is a pretty big topic, so I've moved everything to another journal: [AsyncData in Typescript - Component Enhancer](./AsyncData%20in%20Typescript%20-%20Component%20Enhancer.md)