// ee-format.js

export const ESERIES = {
  E12: [
    1,
    1.2,
    1.5,
    1.8,
    2.2,
    2.7,
    3.3,
    3.9,
    4.7,
    5.6,
    6.8,
    8.2,
  ],
};

export const PREFIX_EXPONENT = {
  G: 9,
  M: 6,
  k: 3,
  m: -3,
  u: -6,
  'µ': -6,
  n: -9,
  p: -12,
};

/**
 * Matches JS float style numbers followed by a unit prefix and unit.
 *
 * Matches:
 * 1. The floating point number string.
 * 2. The optional unit with optional prefix.
 *
 * @type {RegExp}
 */
export const FLOAT_TEXT_WITH_UNIT_RE = /^\s*(-?(?:(?:[0-9]*\.)?[0-9]+)(?:[eE]-?[0-9]+)?)\s*(\S*)\s*$/;

export function floatFromExponentialWithUnit(textWithPrefix) {
  const numberPartMatches = FLOAT_TEXT_WITH_UNIT_RE.exec(textWithPrefix);

  if (numberPartMatches == null) {
    return NaN;
  }

  const [, numberText, unitText] = numberPartMatches;
  const exponent = exponentFromUnitText(unitText);
  const numberValue = parseFloat(numberText);

  if (Number.isNaN(numberValue)) {
    return NaN;
  }

  return numberValue * 10 ** exponent;
}

function exponentFromUnitText(unitText) {
  if (unitText === '') {
    return 0;
  }

  if (unitText in PREFIX_EXPONENT) {
    return PREFIX_EXPONENT[unitText];
  }

  const prefix = unitText.substr(0, 1);

  if (prefix in PREFIX_EXPONENT) {
    return PREFIX_EXPONENT[prefix];
  }

  // Assuming it's a unit instead of a prefix.
  return 0;
}
