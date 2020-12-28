import { byPreference } from '../common/comparators.js';
import { ESERIES } from '../common/ee-format.js';
import { elementStreamFromElementEvent, getElement } from '../common/mithril-stream-utils.js';
import { byHasTag } from '../common/multivalue.v1/comparators.js';
import { multivalueFromValueAndPreferredValues, TAGS } from '../common/multivalue.v1/eeUtils.js';

// This script is actually an initial test of Multivalue, but shhhh you didn't hear that here.
// ... you read it, instead.

const inputValue = elementStreamFromElementEvent('#e12-values__input-value', 'keyup')
  .map(elem => parseFloat(elem.value))
  ;

const preferredMultivalue = inputValue.map(value => multivalueFromValueAndPreferredValues(value, ESERIES.E12));

const lowerValue = preferredMultivalue.map(multivalue =>
  multivalue.getValue(byPreference(
    byHasTag(TAGS.PREFERRED_LOWER)
  ))
);

const higherValue = preferredMultivalue.map(multivalue =>
  multivalue.getValue(byPreference(
    byHasTag(TAGS.PREFERRED_HIGHER)
  ))
);

lowerValue.map(value => {
  getElement('#e12-values__deriv-lower').value = value;
});

higherValue.map(value => {
  getElement('#e12-values__deriv-higher').value = value;
});
