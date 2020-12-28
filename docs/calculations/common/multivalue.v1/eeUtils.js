import {
  nextLowerAndHigherSeriesValuesFromValue,
} from '../ee-format.js';

import Multivalue from './Multivalue.js';
import MultivalueElement from './MultivalueElement.js';

/**
 * Some pre-defined tags that are generally useful.
 */
export const TAGS = {
  PREFERRED_HIGHER: 'PREFERRED_HIGHER',
  PREFERRED_LOWER: 'PREFERRED_LOWER',
  EXACT_VALUE: 'EXACT_VALUE',
  MAX_VALUE: 'MAX_VALUE',
  MIN_VALUE: 'MIN_VALUE',
};

export function multivalueFromValueAndPreferredValues(value, series) {
  const {
    nextLower,
    nextHigher,
  } = nextLowerAndHigherSeriesValuesFromValue(value, series);

  return Multivalue.ofElements([
    MultivalueElement.of(value, [TAGS.EXACT_VALUE]),
    MultivalueElement.of(nextLower, [TAGS.PREFERRED_LOWER]),
    MultivalueElement.of(nextHigher, [TAGS.PREFERRED_HIGHER]),
  ]);
}
