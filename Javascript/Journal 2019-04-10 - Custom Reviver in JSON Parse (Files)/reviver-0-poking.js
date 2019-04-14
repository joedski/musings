const value0Serialized = JSON.stringify({
  foo: [
    { id: 1, bar: 'yay' },
    { id: 75, bar: 'boo' },
  ],
  bar: true,
});

const calls = [];

const value0Parsed = JSON.parse(
  value0Serialized,
  (key, value) => {
    calls.push([key, JSON.stringify(value)]);
    return value;
  }
);

console.log('First result');
calls.forEach(([key, valueString]) => {
  console.log('-', typeof key, JSON.stringify(key), valueString);
});
