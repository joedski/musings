// NOTE: I have no idea if things are actually consistent enough
// for this to work, but eh, here's a first whack:
// - cases*.js files have module.exports as an array of objects:
//    - Each object has `args` and `result`.
//    - `args` is an array of arguments to pass to the implementation to test.
//    - `result` is the expected result, which will be compared by deep equality.
//    - Not covered: More complicated equality checks?
// - impl-*.js files each have module.exports as an implementation function:
//    - This function should expect arguments in the same order as
//      provided by all the cases*.js files.

const fs = require('fs');
const path = require('path');
const { promisify, isDeepStrictEqual, format } = require('util');

const readdirAsync = promisify(fs.readdir);

const dir = process.argv[2];

if (!dir) {
  console.error(`usage: node ${process.argv[1]} <kata-dir>`);
  throw new Error('No dir argument specified');
}

readdirAsync(dir)
.then(entries => {
  console.log(`
${dir}
========
`);

  const implsFiles = entries.filter(e => e.startsWith('impl-'));
  const casesFiles = entries.filter(e => e.startsWith('cases'));

  if (!casesFiles.length || !implsFiles.length) {
    throw new Error('No cases or implementations to test');
  }

  const impls = implsFiles.map(f => require(`./${path.join(dir, f)}`));
  const cases = casesFiles
    .map(f => require(`./${path.join(dir, f)}`))
    .map((cs, i) =>
      cs.map((c, ci) => ({ ...c, source: `${casesFiles[i]}[${ci}]`}))
    )
    .reduce(
      (acc, next) => [...acc, ...next],
      []
    )
    ;

  impls.map((fn, i) => {
    console.log(`Testing "${implsFiles[i]}"...`);

    const casesResults = cases.map((testCase, i) => {
      try {
        console.log(`  Case ${testCase.source}:`)

        const result = fn(...testCase.args);
        const pass = isDeepStrictEqual(result, testCase.result);
        const caseResult = {
          case: testCase,
          result,
          pass,
        };

        console.log(`    Result: ${pass ? 'PASS' : 'FAIL'}`);
        if (!caseResult.pass) {
          console.log(`    Expected: ${JSON.stringify(caseResult.case.result)}`);
          console.log(`    Received: ${JSON.stringify(caseResult.result)}`);
        }
        console.log('');

        return caseResult;
      }
      catch (error) {
        const caseResult = {
          case: testCase,
          pass: false,
          error,
        };

        console.log(`    Result: ERROR`);
        const errorMessage = format(error).replace(/^/mg, '      ');
        console.log(errorMessage);

        return caseResult;
      }
    });
  });
})
.then(() => {
  process.exit(0);
})
.catch(error => {
  console.error(error);
  process.exit(1);
})
;
