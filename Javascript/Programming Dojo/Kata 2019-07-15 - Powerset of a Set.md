Kata 2019-07-15 - Powerset of a Set
===================================

The power set of a set is the set of all its subsets. Write a function that, given a set, generates its power set.

Example:

- Given `{1, 2, 3}`
- it should return `{{}, {1}, {2}, {3}, {1, 2}, {1, 3}, {2, 3}, {1, 2, 3}}`

Notice that the null set is an element of a powerset.

> From OP: As a hint to people without strong math backgrounds, the method for generating power sets is binary counting, with the number of subsets being 2^n where n is the number of elements in the original set
>
> for example `000 => {}`, `001 => {3}`, `010 => {2}`, `011 => {2, 3}` and so on



## Solution 1

This solution is a literal realization of the above-stated hint: It just iterates over each number from 0 to 2^(Size-1) and treats each such number as a bitfield, where each digit is checked by-index.  If the digit at a given index has a 1, that index is then used to pick an element out of the original Set.

Obviously, to do that, we'll need to convert the Set to an ordered thing, which is Javascript means an Array, but that's an implementation detail.

- Allocations:
    - 1 Set for output.
    - 1 Array for ordered-element access of input.
    - 1 + (2 ^ Set.Size) iterators during processing.
- Calls:
    - 1 call to `powerSequence`.
    - 2 ^ Set.Size calls to `bitfieldIndices`.
- Thoughts:
    - We could reduce the allocations by just tracking all the state in the `powerset` function itself rather than delegating that state tracking to generator functions.  This is a "trivial" change, though, and I don't feel it's worth creating a separate implementation just for that.
        - In a production implementation, it'd probably be worth doing this.  Basically just replace the for-of loops in the `powerset` function with the for loops of the respective generator functions.
    - Depending on the target use case, `powerset` itself should be made into a generator function so as to avoid allocating a Set of 2^Set.Size elements.  In that case, all that really happens is `result.add()` becomes `yield powersetElem`, though obviously that has to be done after adding the elements from the original set to the `powersetElem`.

```js
function* powerSequence(n) {
  const target = 2 ** n;
  for (let a = 0; a < target; ++a) {
    yield a;
  }
}

function* bitfieldIndices(bitfield) {
  for (
    let s = 0, n = bitfield;
    n > 0;
    ++s, n = n >> 1
  ) {
    if (n & 1) yield s;
  }
}

module.exports = powerset;
function powerset(s) {
  const result = new Set();
  const elemsInOrder = [...s];

  for (const bitfield of powerSequence(s.size)) {
    const powersetElem = new Set();
    result.add(powersetElem);

    for (const index of bitfieldIndices(bitfield)) {
      powersetElem.add(elemsInOrder[index]);
    }
  }

  return result;
}
```
