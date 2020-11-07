import {
  FLOAT_TEXT_WITH_UNIT_RE,
  floatFromExponentialWithUnit,
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
  const testCaseList = [
    {
      text: '1',
      expected: 1,
      withinDigits: 8
    },
    {
      text: '1.4',
      expected: 1.4,
      withinDigits: 8
    },
    {
      text: '1.4e2',
      expected: 1.4e2,
      withinDigits: 8
    },
    {
      text: '1.4e-2',
      expected: 1.4e-2,
      withinDigits: 8
    },
    {
      text: '1.4e-2',
      expected: 1.4e-2,
      withinDigits: 8
    },
    {
      text: '1.4Ω',
      expected: 1.4,
      withinDigits: 8
    },
    {
      text: '1.4mV',
      expected: 1.4e-3,
      withinDigits: 8
    },
    {
      text: '1.4k',
      expected: 1.4e3,
      withinDigits: 8
    },
    {
      text: '1.4µ',
      expected: 1.4e-6,
      withinDigits: 8
    },
    {
      text: '7.56M',
      expected: 7.56e6,
      withinDigits: 8
    },
  ];

  for (const testCase of testCaseList) {
    test(`should parse "${testCase.text}" to ${testCase.expected} (within ${testCase.withinDigits} digits)`, () => {
      const result = floatFromExponentialWithUnit(testCase.text);
      expect(result)
        .toBeCloseTo(testCase.expected, testCase.withinDigits);
    });
  }
});
