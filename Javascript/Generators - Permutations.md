Generators - Permutations
=========================

Just a bit of amusement.

Given an array of Generator Functions, create a new Generator Function that takes that array and returns a new Generator that generates Permutations of all the values of the original Generator Functions.  Naturally, this only works if each original Generator Function yields a finite sequence.

We could start with the most trivial case, but the most trivial case is a permutation of no sequences, the empty set of sequences: `[]`.

That can be done with this:

```js
function *eachPermutation() {
  return
}
```

Next actual case is that of one:

```js
function *eachPermutation1(fn0) {
  for (const res0 of fn0())
    yield [res0]
}
```

Very simple.  Basically just wrapping each value in an array.

Next case up is two sequences:

```js
function *eachPermutation2(fn0, fn1) {
  for (const res0 of fn0())
    for (const res1 of fn1())
      yield [res0, res1]
}
```

And we could do N sequences with N for loops... and define N functions.  could we do that a bit better?

As it happens, we can use this to treat N sequences as 1+(N-1) sequences, all the way down until we hit N=2:

```js
function *eachPermutation(fns) {
  if (! fns || ! fns.length) {
    return
  }
  else if (fns.length === 1) {
    for (const res0 of fns[0]())
      yield [res0]
  }
  else {
    for (const res0 of fns[0]())
      for (const res1 of eachPermutation(fns.slice(1)))
        yield [res0].concat(res1)
  }
}
```

The only complication then is that we have to recur with the list of other sequences, and remember to concat its values.



## Flattening

Suppose we don't want to recur, though?  Can we flatten this?  We won't be able to use a mere `for of` loop for everything, since we would basically need to somehow expand it out and, anyway to do that in JS without resorting to macros is basically the same as the above recursion solution.

We'll need to play with the generators directly, then.

Starting back at the N=1 case, since the N=0 case will still yield `[]`, we can observe this about how we treat the generator:

- If the generator is `done`, then we are `done` too.

```js
function *eachPermutation(fns) {
  if (! fns || ! fns.length) {
    return
  }

  const gens = fns.map(fn => fn())
  const reses = gens.map(gen.next())

  while (! reses[0].done) {
    yield [reses[0].value]
    reses[0] = gens[0].next()
  }
}
```

What what about when we have 2?  Well, it's a bit tough to think about in the abstract, so let's just start with the raw steps:

- Assume both generators will yield at least 1 value, since any generator yielding 0 values will result in a null set of permutations.  Anything times 0 is 0.
- When initialized, both results are not `done`.
- Yield a set.
- Get the next result for the second generator.
- Is the second generator `done`?
- Get the next result for the first generator ~~and reinitialize the second generator.~~
- Is the first generator `done`?
    - If yes, Return.
    - Otherwise, reinitialize any generators that yielded `done` and grab their first results.

```js
function *eachPermutation(fns) {
  if (! fns || ! fns.length) {
    return
  }

  const gens = fns.map(fn => fn())
  const reses = gens.map(gen.next())

  // if any are done by the time we reiterate, we're done.
  while (! reses.some(res => res.done)) {
    yield reses.map(res => res.value)
    reses[1] = gens[1].next()
    if (reses[1].done) {
      reses[0] = gens[0].next()
    }
    if (reses[0].done) {
      // There's no -1, so we're done.
      return
    }
    reses.forEach((res, i) => {
      if (res.done) {
        gens[i] = fns[i]()
        reses[i] = gens[i].next()
      }
    })
  }
}
```

That certainly works.  In fact, as written, there's only one part that's not general, and that's the middle part where the next results are grabbed.  So what's happening there?

- We get the next result of the very last generator.
- Is it `done`?
    - If Yes, we check if there's another generator the next level up.
        - If Yes, we get the next result of that generator.
            - Is it `done`?
                - If Yes, we check if there's another generator the next level up...
        - If No, we're done, and Return.

Reminds me of a mechanical counter.

The upshot here is that this is trivial to implement as an iterative process:

- Start with N = Index of Last Result
- Loop with N:
    - Check if N < 0:
        - If Yes: All Permutations are `done`.  Exit.
        - Otherwise, continue.
    - For Generator and Result at N:
        - Get `next` Result from Generator.
        - Check Result: Is Result `done`?
            - If Yes: Recur Loop with N - 1.
            - Otherwise, break Loop.
- If Permutations process is not Exited:
    - For Each Generator whose corresponding Result was `done`:
        - Reinitialize that Generator.
        - Reinitialize Result with first Result from that Generator.

Pretty simple, all done and told.

```js
function *eachPermutation(fns) {
  if (! fns || ! fns.length) {
    return
  }

  const gens = fns.map(fn => fn())
  const reses = gens.map(gen => gen.next())

  // if any are done by the time we reiterate, we're done.
  // This also catches any gens that don't yield any results
  // before terminating.
  while (! reses.some(res => res.done)) {
    // .map ensures a new array each iteration.
    yield reses.map(res => res.value)

    for (let n = fns.length - 1; ; --n) {
      // If we would "overflow" the first generator, we're done,
      // terminate the generator.
      if (n < 0) return

      reses[n] = gens[n].next()

      if (reses[n].done) continue
      else break
    }

    for (let n = 0, l = fns.length; n < l; ++n) {
      if (reses[n].done) {
        gens[n] = fns[n]()
        reses[n] = gens[n].next()
      }
    }
  }
}
```

We can also do one which iterates the first-first rather than last-first:

```js
function *eachPermutationLeft(fns) {
    for (const res of eachPermutation(fns.reverse())) {
        // Since res is a new array each iteration,
        // we can safely reverse in place.
        yield res.reverse()
    }
}
```
