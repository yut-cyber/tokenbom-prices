import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = p => readFileSync(join(root, p), 'utf8');
const pkg = JSON.parse(read('package.json'));

const tpl = read('src/index.html');
const css = read('src/styles.css');
const data = read('src/data/snapshot.json');
const calc = read('src/calc.mjs').replace(/^export /gm, '');
const app = read('src/app.js')
  .replace("import * as calc from './calc.mjs';\n", () => '')
  .replace(
    "'use strict';\n",
    () => `'use strict';
const calc = (() => {
${calc}  return { fmtNum, fmtPrice, fmtCNY, fmtTok, creditCnyOf, splitUsage, derived, deltaPercent };
})();
const { fmtNum, fmtPrice, fmtCNY, fmtTok, derived } = calc;
`
  )
  .replace("const VERSION = '1.0.0';", () => `const VERSION = '${pkg.version}';`);

const html = tpl
  .replace('/*__INLINE_CSS__*/', () => css)
  .replace('/*__INLINE_DATA__*/', () => data)
  .replace('/*__INLINE_JS__*/', () => app);

for (const p of ['/*__INLINE_CSS__*/', '/*__INLINE_DATA__*/', '/*__INLINE_JS__*/', "from './calc.mjs'"]) {
  if (html.includes(p)) { console.error('placeholder/module left in output: ' + p); process.exit(1); }
}
if (!html.trimEnd().endsWith('</html>')) { console.error('output looks truncated'); process.exit(1); }
JSON.parse(data);
writeFileSync(join(root, 'index.html'), html);
console.log(`build ok: index.html ${Buffer.byteLength(html)} bytes (v${pkg.version})`);
