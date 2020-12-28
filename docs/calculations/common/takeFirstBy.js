/**
 * Take the ordered-first element from a non-empty list, as according
 * to the given comparator.
 *
 * The last-ordered element can be taken by simply inverting the comparator.
 *
 * @template T Element type.
 * @param {T[]} list Possibly unsorted list of elements.
 * @param {(a: T, b: T) => number} comparator Sort-comparator over two elements.
 * @throws {TypeError} If the list is empty.
 */
export default function takeFirstBy(list, comparator) {
  return list.reduce((current, next) => {
    if (comparator(current, next) >= 0) {
      return current;
    }

    return next;
  });
}
