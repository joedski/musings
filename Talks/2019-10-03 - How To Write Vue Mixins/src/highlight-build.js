// Actually, I think we don't need this...
// because the highlight.js plugin provided by reveal.js includes
// a bundled version of highlight.js.

import hljs from 'highlight.js/lib/highlight';
import javascript from 'highlight.js/lib/languages/javascript';
import javascript from 'highlight.js/lib/languages/typescript';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('jsx', javascript);

hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);

window.hljs = hljs;
