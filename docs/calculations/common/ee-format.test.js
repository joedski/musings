import {
  FLOAT_TEXT_WITH_UNIT_RE,
  ESERIES,
  floatFromExponentialWithUnit,
  nearestSeriesValueFromValue,
  exponentFromValue,
  nextLowerSeriesValueFromSignificand,
  nextHigherSeriesValueFromSignificand,
  rationallyCloserValue,
} from './ee-format.js';

describe('FLOAT_TEXT_WITH_UNIT_RE', () => {
  const parseableTestCaseList = [
    {
      text: '1',
      expected: ['1', ''],
    },
    {
      text: ' 1.5',
      expected: ['1.5', ''],
    },
    {
      text: '-1.5',
      expected: ['-1.5', ''],
    },
    {
      text: '75e6 ',
      expected: ['75e6', ''],
    },
    {
      text: '7.32e6',
      expected: ['7.32e6', ''],
    },
    {
      text: ' 7.32e-6 ',
      expected: ['7.32e-6', ''],
    },
    {
      text: '1mV',
      expected: ['1', 'mV'],
    },
    {
      text: ' 1 mV',
      expected: ['1', 'mV'],
    },
    {
      text: '1.5 kΩ ',
      expected: ['1.5', 'kΩ'],
    },
    {
      text: ' -1.5µA ',
      expected: ['-1.5', 'µA'],
    },
    {
      text: '75e6pF',
      expected: ['75e6', 'pF'],
    },
    {
      text: ' 7.32e6 MΩ',
      expected: ['7.32e6', 'MΩ'],
    },
    {
      text: '7.32e-6 Ω ',
      expected: ['7.32e-6', 'Ω'],
    },
  ];

  for (const testCase of parseableTestCaseList) {
    test(`should get parts ${JSON.stringify(testCase.expected)} from "${testCase.text}"`, () => {
      const match = FLOAT_TEXT_WITH_UNIT_RE.exec(testCase.text);
      expect(match).not.toBeNull();

      const [, ...matchGroups] = match;
      expect(matchGroups).toEqual(testCase.expected);
    });
  }
});

describe('floatFromExponentialWithUnit', () => {
  const withinDigits = 8;
  const testCaseList = [
    {
      text: '1',
      expected: 1,
    },
    {
      text: '1.4',
      expected: 1.4,
    },
    {
      text: '1.4e2',
      expected: 1.4e2,
    },
    {
      text: '1.4e-2',
      expected: 1.4e-2,
    },
    {
      text: '1.4e-2',
      expected: 1.4e-2,
    },
    {
      text: '1.4Ω',
      expected: 1.4,
    },
    {
      text: '1.4mV',
      expected: 1.4e-3,
    },
    {
      text: '1.4k',
      expected: 1.4e3,
    },
    {
      text: '1.4µ',
      expected: 1.4e-6,
    },
    {
      text: '7.56M',
      expected: 7.56e6,
    },
  ];

  for (const testCase of testCaseList) {
    test(`should parse "${testCase.text}" to ${testCase.expected} (within ${testCase.withinDigits} digits)`, () => {
      const result = floatFromExponentialWithUnit(testCase.text);
      expect(result)
        .toBeCloseTo(testCase.expected, withinDigits);
    });
  }
});

describe('nearestSeriesValueFromValue', () => {
  describe('E12 series values', () => {
    const withinDigits = 4;
    const series = ESERIES.E12;
    const testCaseList = [
      {
        value: 12,
        expectedNearest: 12,
      },
      {
        value: 10,
        expectedNearest: 10,
      },
      {
        value: 12.6,
        expectedNearest: 12,
      },
      {
        value: 8000,
        expectedNearest: 8200,
      },
      {
        value: 8350,
        expectedNearest: 8200,
      },
      {
        value: 0.097,
        expectedNearest: 0.1,
      },
      {
        value: 85e-6,
        expectedNearest: 82e-6,
      },
      {
        value: 3.4e3,
        expectedNearest: 3.3e3,
      },
    ];

    for (const testCase of testCaseList) {
      test(`given value ${testCase.value}, should yield ${testCase.expectedNearest}`, () => {
        const result = nearestSeriesValueFromValue(testCase.value, series);
        expect(result).toBeCloseTo(testCase.expectedNearest, withinDigits);
      });
    }
  });
});

describe('exponentFromValue', () => {
  const testCaseList = [
    {
      value: 1,
      expectedExponent: 0,
    },
    {
      value: 1200,
      expectedExponent: 3,
    },
    {
      value: 0.05,
      expectedExponent: -2,
    },
    {
      value: 65e3,
      expectedExponent: 4,
    },
  ];

  for (const testCase of testCaseList) {
    test(`given value ${testCase.value}, should yield exponent ${testCase.expectedExponent}`, () => {
      const result = exponentFromValue(testCase.value);
      expect(result).toEqual(testCase.expectedExponent);
    });
  }
});

describe('nextLowerSeriesValueFromSignificand', () => {
  describe('E12 series values', () => {
    const series = ESERIES.E12;
    const testCaseList = [
      // NOTE: should work because they're literals...
      {
        value: 1.2,
        expected: 1.2,
      },
      {
        value: 1.1,
        expected: 1.0,
      },
      {
        value: 3.4,
        expected: 3.3,
      },
      {
        value: 8.3,
        expected: 8.2,
      },
      {
        value: 9.5,
        expected: 8.2,
      },
    ];

    for (const testCase of testCaseList) {
      test(`given value ${testCase.value}, should yield ${testCase.expected}`, () => {
        const result = nextLowerSeriesValueFromSignificand(testCase.value, series);
        expect(result).toEqual(testCase.expected);
      });
    }
  });
});

describe('nextHigherSeriesValueFromSignificand', () => {
  describe('E12 series values', () => {
    const series = ESERIES.E12;
    const testCaseList = [
      // NOTE: should work because they're literals...
      {
        value: 1.2,
        expected: 1.2,
      },
      {
        value: 1.1,
        expected: 1.2,
      },
      {
        value: 3.4,
        expected: 3.9,
      },
      {
        value: 8.3,
        expected: 10,
      },
    ];

    for (const testCase of testCaseList) {
      test(`given value ${testCase.value}, should yield ${testCase.expected}`, () => {
        const result = nextHigherSeriesValueFromSignificand(testCase.value, series);
        expect(result).toEqual(testCase.expected);
      });
    }
  });
});

describe('rationallyCloserValue', () => {
  const testCaseList = [
    {
      value: 1.05,
      lower: 1,
      higher: 1.2,
      expected: 1,
    },
    {
      value: 1.15,
      lower: 1,
      higher: 1.2,
      expected: 1.2,
    },
    {
      value: 3.4,
      lower: 3.3,
      higher: 3.9,
      expected: 3.3,
    },
  ];

  for (const testCase of testCaseList) {
    test(`given value ${testCase.value} and lower and higher numbers (${testCase.lower}, ${testCase.higher}), should yield ${testCase.expected}`, () => {
      const result = rationallyCloserValue(testCase.value, testCase.lower, testCase.higher);
      expect(result).toEqual(testCase.expected);
    });
  }
});
