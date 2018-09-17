const path = require('path');
const sh = require('shelljs');

const PROJECT_ROOT_PATH = path.resolve(__dirname, '..');
const REVEAL_PATH = item => require.resolve(`reveal.js/${item}`);
const HIGHLIGHT_PATH = item => require.resolve(`highlight.js/${item}`);
const SLIDES_PATH = path.resolve(PROJECT_ROOT_PATH, 'slides');

const DEST_PATH = path.resolve(PROJECT_ROOT_PATH, 'dist');
const DEST_JS_PATH = path.resolve(DEST_PATH, 'js');
const DEST_CSS_PATH = path.resolve(DEST_PATH, 'css');

exports.task = function () {
  sh.rm('-rf', DEST_PATH);
  sh.mkdir('-p', DEST_PATH);

  sh.mkdir('-p', DEST_CSS_PATH);
  sh.cp(REVEAL_PATH('css/reveal.css'), DEST_CSS_PATH);
  sh.cp(REVEAL_PATH('css/theme/black.css'), DEST_CSS_PATH);
  sh.cp(HIGHLIGHT_PATH('styles/gruvbox-dark.css'), DEST_CSS_PATH);

  // Fonts are a bit trickier...
  function copyRevealFont(fontCss) {
    const fontCssPath = REVEAL_PATH(`lib/font/${fontCss}`);
    const fontDirPath = path.dirname(fontCssPath);
    const fontDirName = path.basename(fontDirPath);
    const fontDestDirPath = path.join(DEST_CSS_PATH, fontDirName);

    sh.mkdir(fontDestDirPath);
    sh.cp(path.join(fontDirPath, '*'), fontDestDirPath);
  }

  copyRevealFont('league-gothic/league-gothic.css');
  copyRevealFont('source-sans-pro/source-sans-pro.css');

  sh.mkdir('-p', DEST_JS_PATH);
  sh.cp(REVEAL_PATH('js/reveal.js'), DEST_JS_PATH);
  sh.cp(REVEAL_PATH('lib/js/head.min.js'), DEST_JS_PATH);
  sh.cp(path.join(PROJECT_ROOT_PATH, 'vendor', 'highlight.pack.js'), DEST_JS_PATH);

  function copyRevealPlugin(pluginFile, destPath) {
    const pluginFilePath = REVEAL_PATH(`plugin/${pluginFile}`);
    const pluginDirPath = path.dirname(pluginFilePath);
    const pluginDirName = path.basename(pluginDirPath);
    const pluginDestDirPath = (
      destPath
      ? destPath
      : path.join(DEST_JS_PATH, 'plugin', pluginDirName)
    );

    sh.mkdir('-p', pluginDestDirPath);
    sh.cp(pluginFilePath, pluginDestDirPath);
  }

  copyRevealPlugin('highlight/highlight.js');
  copyRevealPlugin('notes/notes.js');
  copyRevealPlugin('notes/notes.html');

  sh.cp(path.join(SLIDES_PATH, '*.html'), DEST_PATH);
}

if (require.main === module) {
  exports.task();
}
