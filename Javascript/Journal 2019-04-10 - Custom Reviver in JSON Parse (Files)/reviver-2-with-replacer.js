class Bar {
  constructor(id, bar) {
    this.id = id;
    this.bar = bar;
  }
}

const value1Initial = {
  bars: [
    new Bar(1, 'yay'),
    new Bar(42, 'boo'),
  ],
};

function replacer(key, value) {
  if (value && value instanceof Bar) {
    // Replace it with a tagged POJO.
    return {
      ...value,
      '@@Class': 'Bar',
    };
  }

  return value;
}

function reviver(key, value) {
  if (value && typeof value === 'object' && value['@@Class'] === 'Bar') {
    return new Bar(value.id, value.bar);
  }

  return value;
}

const value1Serialized = JSON.stringify(value1Initial, replacer);

console.log('Serialized:');
console.log(' ', value1Serialized);

const value1Parsed = JSON.parse(value1Serialized, reviver);

console.log('Parsed:');
value1Parsed.bars.forEach((parsedBar, i) => {
  const initBar = value1Initial.bars[i];
  console.log('  Bars', i);
  console.log('    Both are Bar?', initBar instanceof Bar, parsedBar instanceof Bar);
  console.log('    Props match?',
    'id?', parsedBar.id === initBar.id,
    'bar?', parsedBar.bar === initBar.bar
  );
});
