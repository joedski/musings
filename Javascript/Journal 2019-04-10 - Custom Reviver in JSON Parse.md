Journal 2019-04-10 - Custom Reviver in JSON Parse
=================================================

Time to finally learn about the custom Reviver Function in `JSON.parse`!

So far, all I know is this:

- It's a function of two arguments that returns the output that will be placed on the ultimate parsing result.
    - `<TValue, TResult>(name: string, value: TValue) => TResult`
        - Where by default, `TResult = TValue`.
- ...?

Time to start [poking it](./Journal%202019-04-10%20-%20Custom%20Reviver%20in%20JSON%20Parse%20%28Files%29/reviver-0-poking.js), I guess.

Starting with this:

```
{
  "foo": [
    { "id": 1, "bar": 'yay' },
    { "id": 75, "bar": 'boo' },
  ],
  "bar": true,
}
```

We see these calls:

- "id" 1
- "bar" "yay"
- "0" {"id":1,"bar":"yay"}
- "id" 75
- "bar" "boo"
- "1" {"id":75,"bar":"boo"}
- "foo" [{"id":1,"bar":"yay"},{"id":75,"bar":"boo"}]
- "bar" true
- "" {"foo":[{"id":1,"bar":"yay"},{"id":75,"bar":"boo"}],"bar":true}

Observations:

- They're referenced in depth-first, post-visit order.
    - This makes sense, it starts at each deepest-primitive and moves along collections, then on up.
- Previous results seem to be passed to the reviver as the value at a given key.
    - CONFIRM: If I return a value from the reviver deeper-in, we'll see that value again later.
        - [Yep](./Journal%202019-04-10%20-%20Custom%20Reviver%20in%20JSON%20Parse%20%28Files%29/reviver-1-instantiation.js).
- The root object itself receives a Key of `""`, the empty string.  ~~Probably.~~ Yes.
    - This means if you give another object a key that's the empty string, you could confuse parsers.  They probably shouldn't depend too much on the keys, then.  Annoying.

To play with this a bit more, I did [a small test with instantiating a class](./Journal%202019-04-10%20-%20Custom%20Reviver%20in%20JSON%20Parse%20%28Files%29/reviver-1-instantiation.js).  I decided when to instantiate by using a property named `@@Class`.  Where's that come from, though?

If we look at the [docs for `JSON.stringify()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify), we see that it goes through a number of steps.  Of interest are these, in order:

- The use of the method `toJSON()` to produce the output to serialize.
    - This would allow us to define the above mentioned `@@Class` property, even though it's not defined on the prototype itself.
- The use of a Replacer Function, to add such things after the fact.
    - This would be the most symmetric with the Reviver Function.

The Replacer actually interests me more, here, since if I have to Revive everything in a central function anyway, I can just create a similar Replacer in the same place.  Keeps things symmetric.

[For instance](./Journal%202019-04-10%20-%20Custom%20Reviver%20in%20JSON%20Parse%20%28Files%29/reviver-2-with-replacer.js):

```js
function replacer(key, value) {
  if (value && value instanceof Bar) {
    // Replace it with a tagged POJO.
    return {
      ...value,
      '@@Class': 'Bar',
    };
  }

  return value;
}

function reviver(key, value) {
  if (value && typeof value === 'object' && value['@@Class'] === 'Bar') {
    return new Bar(value.id, value.bar);
  }

  return value;
}
```

Obviously, this can be used to serialize/deserialize class-based things, though depending on what you're doing with them you might want to use `toJSON` anyway?  For my part, it's mostly about using it with things that are basically "Data Objects That Carry Their Methods With Them", like `AsyncData` or other such things.
