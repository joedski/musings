module.exports = [
  {
    args: [
      new Set([['YUL', 'YYZ']]),
      'YUL',
    ],
    result: ['YUL', 'YYZ'],
  },
  {
    args: [
      new Set([['YUL', 'YYZ'], ['YYZ', 'SFO']]),
      'YUL',
    ],
    result: ['YUL', 'YYZ', 'SFO'],
  },
  {
    args: [
      new Set([['SFO', 'HKO'], ['YYZ', 'SFO'], ['YUL', 'YYZ'], ['HKO', 'ORD']]),
      'YUL',
    ],
    result: ['YUL', 'YYZ', 'SFO', 'HKO', 'ORD'],
  },
  {
    args: [
      new Set([['SFO', 'COM'], ['COM', 'YYZ']]),
      'COM',
    ],
    result: null,
  },
  {
    args: [
      new Set([['A', 'B'], ['A', 'C'], ['B', 'C'], ['C', 'A']]),
      'A',
    ],
    result: ['A', 'B', 'C', 'A', 'C'],
  },
  // Just the same as the previous, but with with (A, C) before (A, B).
  // Setwise it shouldn't matter, but implementation wise...
  {
    args: [
      new Set([['A', 'C'], ['A', 'B'], ['B', 'C'], ['C', 'A']]),
      'A',
    ],
    result: ['A', 'B', 'C', 'A', 'C'],
  },
];
