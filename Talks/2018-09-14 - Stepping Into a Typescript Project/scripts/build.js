const path = require('path');
const sh = require('shelljs');

const PROJECT_ROOT_PATH = path.resolve(__dirname, '..');
const REVEAL_PATH = item => require.resolve(`reveal.js/${item}`);
const HIGHLIGHT_PATH = item => require.resolve(`highlight.js/${item}`);
const SLIDES_PATH = path.resolve(PROJECT_ROOT_PATH, 'slides');

const DEST_PATH = path.resolve(PROJECT_ROOT_PATH, 'dist');
const DEST_JS_PATH = path.resolve(DEST_PATH, 'js');
const DEST_CSS_PATH = path.resolve(DEST_PATH, 'css');

function copyFiles(destBase, srcList) {
  sh.mkdir('-p', destBase);
  srcList.forEach(src => {
    if (Array.isArray(src)) {
      sh.cp('-r', src[0], path.join(destBase, src[1]));
    }
    else {
      sh.cp('-r', src, destBase);
    }
  });
}

exports.task = function () {
  sh.rm('-rf', DEST_PATH);

  copyFiles(DEST_CSS_PATH, [
    REVEAL_PATH('css/reveal.css'),
    REVEAL_PATH('css/theme/black.css'),
    HIGHLIGHT_PATH('styles/gruvbox-dark.css'),
  ]);

  // Fonts are a bit trickier...
  function copyRevealFont(fontCss) {
    const fontCssPath = REVEAL_PATH(`lib/font/${fontCss}`);
    const fontDirPath = path.dirname(fontCssPath);
    const fontDirName = path.basename(fontDirPath);
    const fontDestDirPath = path.join(DEST_CSS_PATH, fontDirName);
    const fontFilesGlob = path.join(fontDirPath, '*');

    copyFiles(fontDestDirPath, [
      fontFilesGlob,
    ]);
  }

  copyRevealFont('league-gothic/league-gothic.css');
  copyRevealFont('source-sans-pro/source-sans-pro.css');

  copyFiles(DEST_JS_PATH, [
    REVEAL_PATH('js/reveal.js'),
    REVEAL_PATH('lib/js/head.min.js'),
    path.join(PROJECT_ROOT_PATH, 'vendor', 'highlight.pack.js'),
  ]);

  function copyRevealPlugin(pluginFile, destPath) {
    const pluginFilePath = REVEAL_PATH(`plugin/${pluginFile}`);
    const pluginDirPath = path.dirname(pluginFilePath);
    const pluginDirName = path.basename(pluginDirPath);
    const pluginDestDirPath = (
      destPath
      ? destPath
      : path.join(DEST_JS_PATH, 'plugin', pluginDirName)
    );

    copyFiles(pluginDestDirPath, [
      pluginFilePath,
    ]);
  }

  copyRevealPlugin('highlight/highlight.js');
  copyRevealPlugin('notes/notes.js');
  copyRevealPlugin('notes/notes.html');

  sh.cp(path.join(SLIDES_PATH, '*.html'), DEST_PATH);
}

if (require.main === module) {
  exports.task();
}
