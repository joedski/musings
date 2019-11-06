const path = require('path');
const sh = require('shelljs');

const talkMeta = {
  subdir: '2019-10-03-how-to-write-vue-mixins',
  date: '2019-10-03',
  title: `How to Write Vue Mixins That Don't Make You Hate Everything`,
};

const PROJECT_ROOT_PATH = path.resolve(__dirname, '..');
const REPO_ROOT_PATH = path.resolve(PROJECT_ROOT_PATH, '..', '..');

const FILES_PATH = path.resolve(PROJECT_ROOT_PATH, 'dist');
const DOCS_ROOT_PATH = path.resolve(REPO_ROOT_PATH, 'docs');
const DEST_PATH = path.resolve(DOCS_ROOT_PATH, 'talks', talkMeta.subdir);
const META_PATH = path.resolve(DOCS_ROOT_PATH, '_talks', `${talkMeta.subdir}.md`);

exports.task = function () {
  if (! sh.test('-d', FILES_PATH)) {
    throw new Error(`No dist/ folder detected; check that the project was built`);
  }

  console.log(`Clearing '${path.relative(REPO_ROOT_PATH, DEST_PATH)}'...`);
  sh.rm('-rf', DEST_PATH);

  console.log(`Copying dist files to '${path.relative(REPO_ROOT_PATH, DEST_PATH)}'...`);
  sh.mkdir('-p', DEST_PATH);
  sh.cp('-r', path.join(FILES_PATH, '*'), DEST_PATH);

  console.log(`Writing meta to '${path.relative(REPO_ROOT_PATH, META_PATH)}'...`);
  sh.ShellString(`---
subdir: ${talkMeta.subdir}
date: ${talkMeta.date}
title: ${talkMeta.title}
---
`).to(META_PATH);
}

if (require.main === module) {
  exports.task();
}
