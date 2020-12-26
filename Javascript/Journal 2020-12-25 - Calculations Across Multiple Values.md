Journal 2020-12-25 - Calculations Across Multiple Values
========

There's a case that came up recently that I wanted to cover:

- Suppose I have a computation that involves a resistor value, but I want to account for all of:
    - The exact resistance given
    - The next higher resistance in the preferred series being used (usually E12 for me)
    - The next lower resistance in the preferred series being used

What would be a good way to do that?  Well, my first thought is to just track multiple values, since we'll need all of them.  Now, I could just use an array of values, but I may also want to associate tags with them, to pass some intent.

So, maybe each one would be more or less something like:

```typescript
type Multivalue<T> = Set<MultivalueElement<T>>;
type MultivalueElement<T> = {
  value: T;
  tags: string[];
};
```

A set sounds nice, but it'd also be nice to have a more defined order.  Or maybe the order is only defined by the get function you pass?  Hmm!



## To start...


### Creating Multivalues from Plain Values

Putting that aside, first we'll need a way to actually create a Multivalue from a plain value.

```typescript
class Multivalue<T> {
  static of<T>(value: T, tags: Iterable<string> = []) {
    return new Multivalue<T>([MultivalueElement.of(value, tags)]);
  }

  static ofElements<T>(...elementList: MultivalueElement<T>[]) {
    return new Multivalue<T>(elementList);
  }

  // ...
}

class MultivalueElement<T> {
  static of<T>(value: T, tags: Iterable<string> = []) {
    return new MultivalueElement<T>(value, [...tags]);
  }
}
```

We're assuming of course that there's a constructor interface that accepts a Set.  We're also assuming that Multivalue wraps the Set as an implementation detail.  Perhaps in that case, we don't even bother with the Set?

> Aside 1: Type-inferrence wise, I've found using functions tends to play better in more cases than classes do.  Frequently, I need to specify the types in Constructor expressions.

> Aside 2: Speaking of order, I originally had `MultivalueElement#tags` be a Set, but decided that an Array was better here.  Why?  Because order may be important.  Consider that 2 different calculations may be applied with both higher and lower E12 values.  That results in 4 values, A(Higher) by B(Higher), A(Higher) by B(Lower), A(Lower) by B(Higher), and A(Lower) by B(Lower().
>
> I haven't decided yet if the Multivalue itself needs to store its elements ordered or not.  Given we can't really define how Set determines element equality, an Array may be used anyway.  Regardless, I do think that the selected value should be determined by some selection predicate or ordering function that gets passed in, so as to explicitly determine the desired value to show, rather than pulling one out at random.  Because of that, an Array may be more efficient anyway since we'd have to convert it to an Array to sort it.


### Getting a Value from Multivalues

Now, we need to be able to get a value out, but because there are potentially many values we also need to be able to determine a preference...

- We might prefer a value that has a given tag
- Or even a value that has a given tag followed by or preceded by another tag
- Or we might prefer whatever the biggest value is
- etc, etc!

Basically, we need a comparator function!  Which, incidentally is the same sort of function we pass to `Array#sort`... So.

```typescript
type MultivalueComparator<T> = (a: MultivalueElement<T>, b: MultivalueElement<T>) => number;

function withGreatestValue<T>(a: MultivalueElement<T>, b: MultivalueElement<T>): number {
  const diff = b - a;

  if (diff < 0) return -1;
  if (diff > 0) return 1;
  return 0;
}

function withLeastValue<T>(a: MultivalueElement<T>, b: MultivalueElement<T>): number {
  return -(withGreatestValue(a, b));
}

function withTag(tag: string) {
  return function preferElementWithTag<T>(a: MultivalueElement<T>, b: MultivalueElement<T>): number {
    // OPTIMIZATION NOTE: a WeakMap cache could be used to skip subsequent calls to Array#includes.
    const aHasTag = a.tags.includes(tag);
    const bHasTag = b.tags.includes(tag);

    if (aHasTag && !bHasTag) return 1;
    if (!aHasTag && bHasTag) return -1;
    return 0;
  }
}

function withNthLastTag(n: number, tag: string) {
  return function preferElementWithLastTag<T>(a: MultivalueElement<T>, b: MultivalueElement<T>): number {
    // OPTIMIZATION NOTE: a WeakMap cache could be used to skip subsequent calls to Array#includes.
    const aHasTag = a.tags[a.tags.length - 1 - n] === tag;
    const bHasTag = b.tags[b.tags.length - 1 - n] === tag;

    if (aHasTag && !bHasTag) return 1;
    if (!aHasTag && bHasTag) return -1;
    return 0;
  }
}

function withLastTag(tag: string) {
  return withNthLastTag(0, tag);
}

// ... etc.
```

But we don't want just 1 comparator, we may need many, in order of preference!  Like `prefer(withTag(TAG_FOO), withGreatestValue)`.

```typescript
function prefer<T>(...comparatorList: MultivalueComparator<T>[]) {
  return function byPreference<T>(a: MultivalueElement<T>, b: MultivalueElement<T>): number {
    for (const comparator of comparatorList) {
      const result = comparator(a, b);
      if (result !== 0) return result;
    }

    return 0;
  }
}
```

That then gets used by...

```typescript
const value = multivalue.getValue(prefer(
  withTag(TAG_FOO),
  withTag(TAG_BAR),
  withGreatestValue
));

const allValues = multivalue.getAllValues(prefer(
  withTag(TAG_FOO),
  withTag(TAG_BAR),
  withGreatestValue
));
```

It follows that one could see `getValue()` being implemented just as `getAllValues()[0]`.  Which it probably would be.  It might be possible to implement an optimized version of `getValue()`, but I'm not sure.  Requires some testing.

In either case, these could be implemented as just simple maps of some sort of `getElement()` and `getAllElements()` methods, since there could be cases where you actually do want the tags.


### Using Multivalue-Unaware Functions: Mapping

We'll take a look at the simpler case of Mapping first.  Flatmapping comes later.

A Multivalue Map is not too different from Array Map, it just requires creating new MultivalueElements with the same tags, and mapping each value therein.

```typescript
class Multivalue<T> {
  public map<R>(fn: (value: T): R): MultivalueMap<R> {
    const nextElements = this.elements.map(
      element => element.map(fn)
    );

    return new Multivalue<R>(nextElements);
  }
}

class MultivalueElement<T> {
  public map<R>(fn: (value: T): R): MultivalueMap<R> {
    return new MultivalueElement<T>(
      fn(this.value),
      this.tags
    );
  }
}
```

Easy peasy.

If we want to turn around and use this for Streams, we have 1 option and an alias for it:

```typescript
const someDerivedStream = valueStream.map(value => value.map(fn));
const alsoDerivedStream = valueStream.map(Multivalue.map(fn));

// literally the same thing, but it might make FPers happier.

class Multivalue<T> {
  static map<T, R>(fn: (value: T) => R): (multivalue: Multivalue<T>) => Multivalue<R> {
    return (multivalue) => multivalue.map(fn);
  }
}
```


### Functions That Map Values to Multivalues: Flatmap Values

There's many ways to do this, but I'll choose to only look at one that's relevant to my needs: composing a subsequent operation on to a previous one.  In part, it's because there's less to consider: the given operation only needs the previous value, but still adds its own tag.

> The more general case is "Flatmap Elements", but I'm not sure of when I would ever need that.  Maybe if I need to manipulate tags, but that just doesn't seem necessary at the moment.

```typescript
class Multivalue<T> {
  flatMap<R>(fn: (value: T) => Multivalue<R>): Multivalue<R> {
    const nextElements: MultivalueElement<R>[] = [];

    for (const prevElement of this.elements) {
      const resultElementList = fn(prevElement.value);

      for (const resultElement of resultElementList) {
        nextElements.push(
          MultivalueElement.of(
            resultElement.value,
            [...prevElement.tags, ...resultElement.tags]
          )
        );
      }
    }

    return Multivalue.ofElements(nextElements);
  }
}
```

It should be pretty obvious by the double-for loop that we get a cartesian product of results.  That's implied by the initial description, but made more explicit by the implementation.

Why do I want to do this?  Mostly to apply math ops with a range of values.

```typescript
const allResistorValues: Multivalue<number> = withPreferred(resistorValue);
const possibleVoltages: Multivalue<number> = baseVoltages.flatMap(
  voltage => allResistorValues.map(resistance => voltage * resistance)
);
```

That could be made into its own thing, really.  I'm not sure what to call that, though.  Bimap?  Bimap With?  Product?  Product Map?

```typescript
class Multivalue<T> {
  public productMap<U, R>(that: Multivalue<U>, fn: (t: T, u: U) => R): Multivalue<R> {
    return this.flatMap(
      thisValue => that.map(thatValue => fn(thisValue, thatValue))
    )
  }
}

// ...

const possibleVoltages = baseVoltages.productMap(allResistorValues, (v, r) => v * r);
```


### Functions That Map Multivalues to Multivalues: Apply

Not really much to say here, it just makes it easier for functional style programming by giving the pattern `multivalue => fn(multivalue)` a name.  I probably won't actually add this unless I need to switch the applied function via stream.

```typescript
class Multivalue<T> {
  public apply<R>(fn: (multivalue: Multivalue<T>) => Multivalue<R>): Multivalue<R> {
    return fn(this);
  }
}
```


### Filtering: Knocking out Values and Deduplicating By

There's one possible applied operation that I can think of, and it's filtering, but for most cases I can think of, it'd be simpler to just directly apply the filter.

As noted in the title, there's two main operations here:

1. Just knocking out values.
2. Deduplicating values, as determined by some predicate.
    - For the greatest determinism, we also need an ordering function.

The first one is pretty easy:

```typescript
class Multivalue<T> {
  public filter(predicate: (value: MultivalueElement<T>) => boolean): Multivalue<T> {
    return Multivalue.of(
      this.values.filter(predicate)
    );
  }
}
```

The second one is a bit trickier:

```typescript
class Multivalue<T> {
  public deduplicate(
    areEqual: (a: MultivalueElement<T>, b: MultivalueElement<T>) => boolean,
    orderedBy: (a: MultivalueElement<T>, b: MultivalueElement<T>) => number
  ): Multivalue<T> {
    const orderedElementList = this.elements.slice().sort(orderedBy);

    // NOTE: because we're mutating orderedElementList, we're doing things index wise.
    for (let givenIndex = 0; givenIndex < orderedElementList.length; ++givenIndex) {
      const given = orderedElementList[givenIndex];

      // Work from the end backwards, so we don't need to fiddle any more
      // with otherIndex than we already have to.
      for (let otherIndex = orderedElementList.length - 1; otherIndex > givenIndex; --otherIndex) {
        const other = orderedElementList[otherIndex];

        if (areEqual(given, other)) {
          orderedElementList.splice(otherIndex, 1);
        }
      }
    }

    return Multivalue.ofElements(orderedElementList);
  }
}
```


### Specific Filtering Case: Keeping Extrema And Exact Values

The above are nice, but what about actual use cases?

One specific case I can think of is that of keeping just the extrema and the exact value.

Not sure we actually need to `filter()` here, though?  We'd probably just do this:

```typescript
const valuesWeCareAbout = Multivalue.ofElements(
  allValues.getElement(withLastTag(TAG_EXACT_VALUE)),
  allValues.getElement(withGreatestValue),
  allValues.getElement(withLeastValue)
);
```

Maybe something like:

```typescript
const valuesWeCareAbout = allValues.keepBy(
  withLastTag(TAG_EXACT_VALUE),
  withGreatestValue,
  withLeastValue
);

// ... or even?

const valuesWeCareAbout = allValues.keepByAndTag({
  [TAG_EXACT_VALUE]: withLastTag(TAG_EXACT_VALUE),
  [TAG_MAX_VALUE]: withGreatestValue,
  [TAG_MIN_VALUE]: withLeastValue
});
```

Hm!
