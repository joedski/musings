const value1Serialized = JSON.stringify({
  bars: [
    { '@@Class': 'Bar', id: 1, bar: 'yay' },
    { '@@Class': 'Bar', id: 3, bar: 'boo' },
  ],
});

class Bar {
  constructor(id, bar) {
    this.id = id;
    this.bar = bar;
  }
}

const value1Parsed = JSON.parse(
  value1Serialized,
  (key, value) => {
    const isBar = (
      value && typeof value === 'object'
      && value['@@Class'] === 'Bar'
    );

    if (isBar) {
      return new Bar(value.id, value.bar);
    }

    const isBarsCollection = (
      key === 'bars'
      && Array.isArray(value)
    );

    if (isBarsCollection) {
      console.log('bars is full of Bar instances?', value.every(v => v instanceof Bar));
    }

    return value;
  }
);

console.log('Is bars[0] instanceof Bar?', value1Parsed.bars[0] instanceof Bar);
