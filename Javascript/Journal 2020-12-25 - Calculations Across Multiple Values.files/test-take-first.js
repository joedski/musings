function takeFirst(list, comparator) {
  return list.reduce((current, next) => {
    if (comparator(current, next) >= 0) {
      return current;
    }

    return next;
  });
}

function takeLast(list, comparator) {
  return takeFirst(list, reverse(comparator));
}

const element = (value, tags) => ({ value, tags });

function byMappedComparator(mapper, byComparator) {
  return function orderedByMappedComparator(a, b) {
    return byComparator(mapper(a), mapper(b));
  };
}

function byAsc(a, b) {
  if (a < b) return 1;
  if (a > b) return -1;
  return 0;
}

function reverse(byComparator) {
  return function byReversedComparator(a, b) {
    return byComparator(b, a);
  };
}

const leastValue = byMappedComparator(element => element.value, byAsc);
const greatestValue = byMappedComparator(element => element.value, reverse(byAsc));

function hasTag(tag) {
  return function orderedByHasTag(a, b) {
    const aHasTag = a.tags.includes(tag);
    const bHasTag = b.tags.includes(tag);

    if (aHasTag && !bHasTag) return 1;
    if (!aHasTag && bHasTag) return -1;
    return 0;
  };
}

function prefer(...comparatorList) {
  return function byPreference(a, b) {
    for (const comparator of comparatorList) {
      const result = comparator(a, b);
      if (result !== 0) return result;
    }

    return 0;
  };
}

const preorderedByValueAsc = [
  element(1, ['foo']),
  element(2, []),
  element(3, ['bar']),
  element(4, ['foo', 'bar']),
  element(5, []),
];

const preorderedByValueDesc = [
  element(5, []),
  element(4, ['foo', 'bar']),
  element(3, ['bar']),
  element(2, []),
  element(1, ['foo']),
];

const shuffledValue = [
  element(3, ['bar']),
  element(5, []),
  element(1, ['foo']),
  element(4, ['foo', 'bar']),
  element(2, []),
];

const shuffledValueWithDupesButDifferentTags = [
  element(3, ['bar']),
  element(5, []),
  element(1, ['foo']),
  element(1, ['bar']),
  element(4, ['foo', 'bar']),
  element(2, []),
];

const everyListByKey = {
  preorderedByValueAsc,
  preorderedByValueDesc,
  shuffledValue,
  shuffledValueWithDupesButDifferentTags
};

function areElementsEqual(a, b) {
  return (
    a.value === b.value &&
    a.tags.every((value, index) => value === b.tags[index])
  );
}

function expectOnEveryList(comparator, expectedValue) {
  for (const listKey of Object.keys(everyListByKey)) {
    const list = everyListByKey[listKey];

    expectOnList(listKey, list, comparator, expectedValue);
  }
}

function expectOnList(listKey, list, comparator, expectedValue) {
  const resultValue = takeFirst(list, comparator);

  if (areElementsEqual(resultValue, expectedValue)) {
    console.log(listKey, '... PASS');
  }
  else {
    console.log(
      '... FAIL!  Expected:', JSON.stringify(expectedValue),
      '... instead received:', JSON.stringify(resultValue)
    );
  }
}

function sectionHeader(sectionTitle) {
  return `============
${sectionTitle}
------------`;
}

console.log(sectionHeader('leastValue'));
expectOnEveryList(leastValue, preorderedByValueAsc[0]);

console.log(sectionHeader('greatestValue'));
expectOnEveryList(greatestValue, preorderedByValueDesc[0]);

console.log(sectionHeader('hasTag("bar"), greatestValue'));
expectOnEveryList(prefer(hasTag('bar'), greatestValue), preorderedByValueAsc[3]);
