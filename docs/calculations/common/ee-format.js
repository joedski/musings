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

  const prefix = unitText.substring(0, 1);

  if (prefix in PREFIX_EXPONENT) {
    return PREFIX_EXPONENT[prefix];
  }

  // Assuming it's a unit instead of a prefix.
  return 0;
}

export function nearestSeriesValueFromValue(value, series) {
  const exponent = exponentFromValue(value);
  // Now on range of 1.00... to 9.99...
  // ... probably.
  const significand = value / (10 ** exponent);

  const nextLower = nextLowerSeriesValueFromSignificand(significand, series);
  const nextHigher = nextHigherSeriesValueFromSignificand(significand, series);

  const closest = rationallyCloserValue(significand, nextLower, nextHigher);

  return closest * 10 ** exponent;
}

export function nearestE12ValueFromValue(value) {
  return nearestSeriesValueFromValue(value, ESERIES.E12);
}

export function exponentFromValue(value) {
  // Honestly this feels kinda hax, and will probably invite strange edge cases.
  const exponentialText = value.toExponential();
  const exponentIndicatorIndex = exponentialText.indexOf('e');
  const exponentText = exponentialText.substring(exponentIndicatorIndex + 1);
  return parseInt(exponentText, 10);
}

export function nextLowerSeriesValueFromSignificand(significand, series) {
  // We don't have a findRight, so we get this instead.
  return series.reduce(
    (current, seriesValue) => {
      if (seriesValue <= significand) {
        return seriesValue;
      }

      return current;
    },
    0
  );
}

export function nextHigherSeriesValueFromSignificand(significand, series) {
  const nextHighestMaybe = series.find(seriesValue => seriesValue >= significand);
  return nextHighestMaybe == null ? 10 : nextHighestMaybe;
}

export function rationallyCloserValue(value, lower, higher) {
  // if value is 1.05, closer is 1.0.
  //   1.0/1.05 = 0.9524; 1.05/1.2 = 0.875
  // if value is 1.15, closer is 1.2.
  //   1.0/1.15 = 0.8696; 1.15/1.2 = 0.9583

  const lowerRatio = lower / value;
  const higherRatio = value / higher;

  if (higherRatio > lowerRatio) {
    return higher;
  }

  return lower;
}
