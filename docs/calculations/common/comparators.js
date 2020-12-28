export function byPreference(...comparatorList) {
  return function orderByPreference(a, b) {
    for (const comparator of comparatorList) {
      const result = comparator(a, b);
      if (result !== 0) return result;
    }

    return 0;
  };
}

export function byAscendingValue(a, b) {
  if (a < b) return 1;
  if (a > b) return -1;
  return 0;
}

export function byReverseOf(comparator) {
  return function byReverseOfComparator(a, b) {
    return comparator(b, a);
  }
}

export const byDescendingValue = byReverseOf(byAscendingValue);

export function byMappedComparator(mapper, comparator) {
  return function $byMappedComparator(a, b) {
    return comparator(mapper(a), mapper(b));
  }
}
