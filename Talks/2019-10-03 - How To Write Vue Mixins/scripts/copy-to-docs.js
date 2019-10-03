const path = require('path');
const sh = require('shelljs');

const PROJECT_ROOT_PATH = path.resolve(__dirname, '..');

const FILES_PATH = path.resolve(PROJECT_ROOT_PATH, 'dist');
const DEST_PATH = path.resolve(PROJECT_ROOT_PATH, '..', '..', 'docs', 'talks', '2019-10-03-how-to-write-vue-mixins');

exports.task = function () {
  if (! sh.test('-d', FILES_PATH)) {
    throw new Error(`No dist/ folder detected; check that the project was built`);
  }

  sh.rm('-rf', DEST_PATH);
  sh.mkdir('-p', DEST_PATH);
  sh.cp('-r', path.join(FILES_PATH, '*'), DEST_PATH);
}

if (require.main === module) {
  exports.task();
}
