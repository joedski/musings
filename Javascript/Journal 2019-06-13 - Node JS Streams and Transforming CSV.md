Journal 2019-06-13 - Node JS Streams and Transforming CSV
=========

I recently needed to merge a couple CSV files, aggregating by a given column and summing the rest of the values.  Off hand, the library I knew how to use was [this CSV library here][npm-csv].  Before, I'd only used the callback-based API, but maybe I could use the stream-based API for a change?  It'd make it easier to write to stdout, though granted, that's just `process.stdout.write("blah\n", "utf8")` for the imperative version.

Besides [`csv`][npm-csv], I needed a few other modules to support everything I wanted to do:

- [`into-stream`][npm-into-stream] to convert an iterable into a stream.
- [`merge-stream`][npm-merge-stream] to merge the events of n streams.
- [`stream-transform`][npm-stream-transform] to format records before writing them back out.

From there I was able to easily chain things together:

- Take file names on the command line, map each one to a `stream.Readable` piped into a [`csv.parse`][npm-csv-parse].
    - This was mostly so that each one could separately strip the header row.
- [Merge][npm-merge-stream] all those together.
- On `data`, aggregate the given datum record by its first column. (It was named `Label` in this case.)
    - I held the items in a Map so that I could later use `map.values()`.
- On `end`, kick off a new set of streams writing to `stdout`:
    - Use [`into.object()`][npm-into-stream] to convert the `map.values()` iterable into a stream of values.
    - [Transform][npm-stream-transform] each one to format any non-primitive values to strings.  Or numbers, but in this case it was just strings.
    - Pipe that to [`csv.stringify`][npm-csv-stringify],
    - and pipe _that_ into `process.stdout`.

This was the nicest experience I've ever had using Node JS Streams.  I don't use streams very often.

I probably should, now that I know enough tools to do the common tasks.  All I need is one that lets me store up stuff and write out a single datum once its all collected, however it determines that.  Hm.

All in all, it looked like this.  Could've organized things a bit better, but eh.

```js
// merge items by Label column.

const fs = require('fs');
const mergeStream = require('merge-stream');
const transform = require('stream-transform')
const parse = require('csv-parse');
const stringify = require('csv-stringify');
const into = require('into-stream');

function aggSum(acc, next) {
  // Will return NaN if next is not convertable to a number.
  return acc + Number(next);
}
aggSum.initial = () => 0;

function aggCollectUnique(acc, next) {
  acc.add(next);
  return acc;
}
aggCollectUnique.initial = () => (new Set());

function aggMax(acc, next) {
  // if acc is or converts to NaN, next is returned.
  // Between dissimilar types, next is returned.
  return next <= acc ? acc : next;
}
aggMax.initial = () => 0;

// It's a Matomo report, if you're curious.
const columns = [
  'Label',
  'Visits',
  'Actions',
  'Maximum actions in one visit',
  'Total time spent by visitors (in seconds)',
  'Bounces',
  'Visits with Conversions',
  'Unique visitors (daily sum)',
  'Users (daily sum)',
  'Metadata: idvisitor',
];

const columnIndexByName = columns.reduce(
  (acc, next, nextIndex) => {
    acc[next] = nextIndex;
    return acc;
  },
  {}
);

const columnAggs = {
  'Label': [aggMax, () => ''],
  'Visits': [aggSum],
  'Actions': [aggSum],
  'Maximum actions in one visit': [aggMax],
  'Total time spent by visitors (in seconds)': [aggSum],
  'Bounces': [aggSum],
  'Visits with Conversions': [aggSum],
  'Unique visitors (daily sum)': [aggSum],
  'Users (daily sum)': [aggSum],
  'Metadata: idvisitor': [aggCollectUnique],
};

const columnCasts = {
  'Label': String,
  'Visits': Number,
  'Actions': Number,
  'Maximum actions in one visit': Number,
  'Total time spent by visitors (in seconds)': Number,
  'Bounces': Number,
  'Visits with Conversions': Number,
  'Unique visitors (daily sum)': Number,
  'Users (daily sum)': Number,
  'Metadata: idvisitor': String,
};

const columnFormatters = {
  'Metadata: idvisitor': v => [...v.values()].join(';'),
}

const aggsByLabel = new Map();
function getAggForLabel(label) {
  if (! aggsByLabel.has(label)) {
    aggsByLabel.set(
      label,
      columns.map(columnLabel => {
        const aggDef = columnAggs[columnLabel];
        if (aggDef.length > 1) return aggDef[1]();
        return aggDef[0].initial();
      })
    );
  }
  return aggsByLabel.get(label);
}

const files = process.argv.slice(2);

const allRecordsStream = mergeStream(
  ...files.map(fileName =>
    fs.createReadStream(fileName, 'utf8')
      .pipe(parse({ from: 2 }))
  )
);

allRecordsStream.on('error', (error) => {
  console.error(error);
  process.exit(1);
});

allRecordsStream.on('data', (record) => {
  const agg = getAggForLabel(record[columnIndexByName['Label']]);
  agg.forEach((acc, index) => {
    const aggDef = columnAggs[columns[index]];
    const colCast = columnCasts[columns[index]] || (a => a);
    agg[index] = aggDef[0](acc, colCast(record[index]));
  });
});

allRecordsStream.on('end', () => {
  const output = into.object(aggsByLabel.values())
  .pipe(transform((record, next) => {
    next(null, record.map((e, i) => {
      const formatter = columnFormatters[columns[i]];
      if (formatter) return formatter(e);
      return e;
    }));
  }))
  .pipe(stringify({
    header: true,
    columns,
  }))
  .pipe(process.stdout)
  ;

  output.on('error', error => {
    console.error(error);
    process.exit(1);
  });

  output.on('end', () => {
    process.exit(0);
  });
});
```



[npm-csv]: https://csv.js.org
[npm-csv-parse]: https://csv.js.org/parse/
[npm-csv-stringify]: https://csv.js.org/stringify/
[npm-into-stream]: https://www.npmjs.com/package/into-stream
[npm-merge-stream]: https://www.npmjs.com/package/merge-stream
[npm-stream-transform]: https://www.npmjs.com/package/stream-transform
