import {
  byMappedComparator,
  byAscendingValue,
  byDescendingValue,
} from '../comparators.js';

export function byHasTag(tag) {
  return function $byHasTag(a, b) {
    const aHasTag = a.tags.includes(tag);
    const bHasTag = b.tags.includes(tag);

    if (aHasTag && !bHasTag) return 1;
    if (!aHasTag && bHasTag) return -1;
    return 0;
  }
}

export const byLeastValue = byMappedComparator(element => element.value, byAscendingValue);
export const byGreatestValue = byMappedComparator(element => element.value, byDescendingValue);
