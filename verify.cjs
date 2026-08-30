const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('src/app.js', 'utf8');
const checks = {
  'new layout sidebar': html.includes('class="sidebar"') && html.includes('class="topbar"'),
  'nav placeholders (B)': html.includes('即将上线') && html.includes('nav-item disabled'),
  'sprite icons': html.includes('id="i-tag"') && html.includes('id="i-moon"') && html.includes('id="i-refresh"'),
  'kpi ids': html.includes('kpi-min') && html.includes('kpi-max') && html.includes('kpi-usage'),
  'tabs': html.includes('id="avail-tabs"') && html.includes('data-avail="needs_supply"'),
  'params card ids': html.includes('id="creditTier"') && html.includes('id="monthlyTokens"') && html.includes('id="currentSpend"'),
  'data card ids': html.includes('id="btn-refresh-side"') && html.includes('id="btn-paste"') && html.includes('id="btn-snapshot"'),
  'modal paste': html.includes('modal-overlay') && html.includes('id="btn-paste-close"'),
  'theme init + toggle': html.includes("tokenbom_theme") && html.includes('btn-theme') && html.includes('icon-sun') && html.includes('icon-moon'),
  'no tailwind cdn': !html.includes('tailwindcss'),
  'no lucide cdn': !html.includes('lucide'),
  'no google cdn in body script': !/<script src="https/.test(html.split('<style>')[1] || ''),
  'design tokens': html.includes('--brand-500:#c96442') && html.includes('.dark {'),
  'fonts import': html.includes('Newsreader') && html.includes('Poppins'),
  'old stats gone': !html.includes('id="stats"') && !html.includes('renderStats'),
  'old avail select gone': !html.includes('id="avail"'),
  'app renderKpis': app.includes('function renderKpis') && app.includes('renderAll() { renderKpis()'),
  'app deltaPercent': app.includes('calc.deltaPercent'),
  'snapshot intact': (html.match(/"model":/g) || []).length === 121,
};
let ok = true;
for (const [k, v] of Object.entries(checks)) { console.log((v ? 'PASS' : 'FAIL') + '  ' + k); if (!v) ok = false; }
const m = html.match(/<script>\n([\s\S]*?)<\/script>\n<\/body>/) || html.match(/<script>\n((?:(?!<\/script>)[\s\S])*)<\/script>\s*<\/body>/);
if (m) { fs.writeFileSync('tmp-check.js', m[1]); console.log('inline JS extracted for syntax check'); }
else console.log('WARN: inline JS not auto-extracted');
process.exit(ok ? 0 : 1);
