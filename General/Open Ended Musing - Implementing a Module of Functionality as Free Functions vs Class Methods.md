Open Ended Musing - Implementing a Module of Functionality as Free Functions vs Class Methods
========

What are the differences between these two setups for some module of code?  Practically, both of these setups can accomplish the same thing, even though the way you call them differs slightly.

- How do they differ ergonomically?
    - That is, what's the difference between them in how you use them?  What do you think of those differences?  How do you feel about them?
    - The most obvious part is in the function signatures, and also in how they're grouped in the module.  Start with that, then consider if there are any others.  There might be, or there might not be!
- What does this tell you about one way of using classes?

There's not much very deep here, but I think it's still interesting to contemplate.

As a more pointed question, if you've read anything about Uncle Bob Martin's Clean Coding stuff, you may have seen the notion of "0 arguments is best, 1 is alright, 2 is getting iffy, 3 is imminent sadness, 4 is right out."  So...

- If fewer arguments is better, and no arguments is best (but not always practical), then how does that feed into thoughts about one style versus another below?



## Example 1: Functionality exposed as just a set of functions operating on a context

```js
// FooProcess.js

function createContext() {
  return {
    // context properties go here...
  };
}

function setThing(context, thing) {
  // ...
}

function processStep(context) {
  // ...
}

function getProgress(context) {
  // ...
}

export {
  createContext,
  setThing,
  processStep,
  getProgress
};
```

These get used like so:

```js
import * as FooProcess from './FooProcess.js';

const context = FooProcess.createContext();

FooProcess.setThing(context, someThingWeGotFromSomewhere);

while(! FooProcess.getProgress(context).isComplete) {
  FooProcess.processStep(context);
}
```



## Example 2: Functionality exposed as a set of methods that operate on a class

```js
// FooProcess.js
class FooProcess {

  // instance properties go here...

  setThing(thing) {
    // ...
  }

  processStep() {
    // ...
  }

  getProgress() {
    // ...
  }
}

export default FooProcess;
```

These get used like so:

```js
import FooProcess from './FooProcess.js';

const proc = new FooProcess();

proc.setThing(someThingWeGotFromSomewhere);

while (! proc.getProgress().isComplete) {
  proc.processStep();
}
```
