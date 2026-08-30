import * as calc from './calc.mjs';

'use strict';
const API_URL = 'https://tokenbom.com/api/models';
const VERSION = '1.0.0';
const LS_DATA = 'tokenbom_data_v1', LS_CFG = 'tokenbom_cfg_v2';
const DEFAULTS = { creditPrice: 0.2, monthlyTokens: 133.3, currentSpend: 8640 };

const state = {
  cfg: { ...DEFAULTS },
  models: [], fetchedAt: null, source: '',
  sort: { key: 'monthly', dir: 'asc' },
  search: '', avail: 'all', hideSunset: false,
};

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2200);
}

function openPaste() { $('paste-panel').classList.remove('hidden'); }
function closePaste() { $('paste-panel').classList.add('hidden'); }

const LS_THEME = 'tokenbom_theme';
function applyTheme(mode) {
  document.documentElement.classList.toggle('dark', mode === 'dark');
  try { localStorage.setItem(LS_THEME, mode); } catch (e) {}
}
function toggleTheme() {
  const dark = document.documentElement.classList.contains('dark');
  applyTheme(dark ? 'light' : 'dark');
  toast(dark ? '已切换到浅色主题' : '已切换到深色主题');
}

/* ---------- 数据装载 ---------- */
function setData(models, fetchedAt, source) {
  state.models = models; state.fetchedAt = fetchedAt; state.source = source;
  try { localStorage.setItem(LS_DATA, JSON.stringify({ fetchedAt, models })); } catch (e) {}
  renderAll();
}

function loadEmbedded() {
  const raw = JSON.parse($('snapshot-json').textContent);
  setData(raw.models, raw.fetchedAt || null, '内嵌快照');
}

function loadLocal() {
  try {
    const d = JSON.parse(localStorage.getItem(LS_DATA) || 'null');
    if (d && Array.isArray(d.models) && d.models.length) {
      setData(d.models, d.fetchedAt, '本地缓存');
      return true;
    }
  } catch (e) {}
  return false;
}

async function tryFetch() {
  toast('正在拉取 tokenbom.com/api/models …');
  try {
    const r = await fetch(API_URL, { mode: 'cors' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    const models = Array.isArray(j) ? j : j.models;
    if (!models || !models.length) throw new Error('响应中没有 models');
    setData(models, new Date().toISOString(), '在线拉取');
    toast('已更新：' + models.length + ' 个模型');
  } catch (e) {
    openPaste();
    toast('跨域被拦截，请用手动更新流程');
  }
}

function parsePasted(text) {
  const err = $('paste-err');
  err.classList.add('hidden');
  try {
    let j = JSON.parse(text.trim());
    let models = Array.isArray(j) ? j : j.models;
    if (!models || !models.length) throw new Error('没有找到 models 数组');
    const first = models[0];
    if (!first.model || !first.pricing) throw new Error('数据结构与预期不符（缺少 model/pricing 字段）');
    setData(models, new Date().toISOString(), '手动粘贴');
    toast('已更新：' + models.length + ' 个模型');
    closePaste();
    $('paste-box').value = '';
  } catch (e) {
    err.textContent = '解析失败：' + e.message;
    err.classList.remove('hidden');
  }
}

function filtered() {
  const q = state.search.toLowerCase();
  let list = state.models.filter(m => {
    if (m.pricing.pricingType !== 'token') return false;
    if (q && !m.model.toLowerCase().includes(q)) return false;
    if (state.avail !== 'all' && m.availability !== state.avail) return false;
    if (state.hideSunset && m.sunset) return false;
    return true;
  });
  const k = state.sort.key, dir = state.sort.dir === 'asc' ? 1 : -1;
  list.sort((a, b) => {
    let va, vb;
    if (k === 'model') { va = a.model; vb = b.model; return va.localeCompare(vb) * dir; }
    const da = derived(a, state.cfg), db = derived(b, state.cfg);
    va = da[{ in: 'inCny', out: 'outCny', blended: 'blended', monthly: 'monthly' }[k]];
    vb = db[{ in: 'inCny', out: 'outCny', blended: 'blended', monthly: 'monthly' }[k]];
    return (va - vb) * dir || a.model.localeCompare(b.model);
  });
  return list;
}

/* ---------- 渲染 ---------- */
function chipsOf(m) {
  const cap = m.capabilities || {};
  const out = [];
  if (cap.maxInputTokens) out.push(fmtTok(cap.maxInputTokens) + ' 上下文');
  if (cap.maxOutputTokens) out.push('出 ' + fmtTok(cap.maxOutputTokens));
  if (cap.vision) out.push('视觉');
  if (cap.toolCall) out.push('工具');
  if (cap.reasoning || cap.thinking) out.push('推理');
  if (cap.pdfInput) out.push('PDF');
  if (cap.audioInput) out.push('音频入');
  if (cap.promptCaching === true) out.push('缓存');
  if (m.outputTpsP50) out.push(m.outputTpsP50 + ' tps');
  return out.map(c => '<span class="chip">' + esc(c) + '</span>').join('');
}

function availBadge(m) {
  const map = { available: ['badge-avail', '可用'], needs_supply: ['badge-supply', '缺供应'], verifying: ['badge-verifying', '验证中'] };
  const [cls, label] = map[m.availability] || ['badge-verifying', m.availability];
  return '<span class="badge ' + cls + '">' + label + '</span>';
}

function renderTable() {
  const list = filtered();
  $('count').textContent = '显示 ' + list.length + ' 个模型';
  const rows = list.map((m, i) => {
    const d = derived(m, state.cfg);
    let delta;
    if (state.cfg.currentSpend <= 0) delta = '<span class="delta-zero">—</span>';
    else if (Math.abs(d.vs) < 0.005) delta = '<span class="delta-zero">≈ 当前</span>';
    else {
      const cls = d.vs < 0 ? 'delta-neg' : 'delta-pos';
      delta = '<span class="' + cls + '">' + calc.deltaPercent(d.vs) + '%</span>';
    }
    const ctx = m.capabilities && m.capabilities.maxInputTokens ? fmtTok(m.capabilities.maxInputTokens) : '—';
    const sunset = m.sunset ? '<span class="badge badge-sunset" title="被 ' + esc(m.sunset.replacedBy || '') + ' 接替">下线 ' + esc((m.sunset.sunsetAt || '').slice(0, 10)) + '</span>' : '';
    return '<tr>' +
      '<td class="l muted">' + (i + 1) + '</td>' +
      '<td class="l"><span class="mname">' + esc(m.model) + '</span><div class="mnote">' + chipsOf(m) + '</div></td>' +
      '<td title="' + esc(m.pricing.inputPriceCredits) + ' 积分/M">¥' + fmtPrice(d.inCny) + '</td>' +
      '<td title="' + esc(m.pricing.outputPriceCredits) + ' 积分/M">¥' + fmtPrice(d.outCny) + '</td>' +
      '<td>¥' + fmtPrice(d.blended) + '</td>' +
      '<td><b>' + fmtCNY(d.monthly) + '</b></td>' +
      '<td>' + delta + '</td>' +
      '<td class="muted">' + ctx + '</td>' +
      '<td>' + availBadge(m) + sunset + '</td>' +
      '</tr>';
  }).join('');
  $('tbody').innerHTML = rows || '<tr><td colspan="9" class="l muted">没有符合条件的模型</td></tr>';

  document.querySelectorAll('thead th.sortable').forEach(th => {
    const arrow = th.querySelector('.arrow');
    arrow.textContent = th.dataset.key === state.sort.key ? (state.sort.dir === 'asc' ? '▲' : '▼') : '';
  });
}

function renderKpis() {
  const c = state.cfg;
  const { tIn, tOut } = calc.splitUsage(c.monthlyTokens);
  $('kpi-usage').textContent = fmtNum(c.monthlyTokens, 1) + 'M';
  $('kpi-usage-sub').textContent = 'tokens / 月（4:1 → ' + fmtNum(tIn, 1) + 'M 入 + ' + fmtNum(tOut, 1) + 'M 出）';
  $('kpi-spend').textContent = fmtCNY(c.currentSpend);
  $('banner-sub').textContent = '覆盖 ' + state.models.length + ' 个主流 AI 模型的实时定价对比，按预估月度成本排序。数据基于 ' +
    fmtNum(c.monthlyTokens, 1) + 'M tokens/月，输入输出 4:1 配比。';

  const list = filtered();
  if (!list.length || c.monthlyTokens <= 0) {
    $('kpi-min').textContent = '—'; $('kpi-min-sub').textContent = '—';
    $('kpi-max').textContent = '—'; $('kpi-max-sub').textContent = '—';
    return;
  }
  const priced = list.map(m => ({ m, d: derived(m, c) }));
  const min = priced.reduce((a, b) => (b.d.monthly < a.d.monthly ? b : a));
  const max = priced.reduce((a, b) => (b.d.monthly > a.d.monthly ? b : a));
  const pctOf = d => c.currentSpend > 0 ? Math.abs(d.monthly / c.currentSpend - 1) * 100 : null;
  const minPct = pctOf(min.d), maxPct = pctOf(max.d);
  $('kpi-min').textContent = fmtCNY(min.d.monthly);
  $('kpi-min-sub').innerHTML = esc(min.m.model) + (minPct != null ? ' · 节省 <b>' + fmtNum(minPct, 1) + '%</b>' : '');
  $('kpi-max').textContent = fmtCNY(max.d.monthly);
  $('kpi-max-sub').innerHTML = esc(max.m.model) + (maxPct != null ? ' · <span class="up">溢价 ' + fmtNum(maxPct, 1) + '%</span>' : '');
}

function renderPerCall() {
  const pcs = state.models.filter(m => m.pricing.pricingType === 'per_call');
  const sec = $('percall');
  if (!pcs.length) { sec.classList.add('hidden'); return; }
  sec.classList.remove('hidden');
  const creditCny = calc.creditCnyOf(state.cfg.creditPrice);
  const rows = [];
  pcs.forEach(m => {
    const p = m.pricing;
    if (p.perCallPricingTable) {
      Object.entries(p.perCallPricingTable)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([k, v]) => {
          const parts = k.split(':');
          rows.push('<tr>' +
            '<td class="l"><span class="mname">' + esc(m.model) + '</span></td>' +
            '<td>' + esc(parts[0] || '—') + '</td>' +
            '<td>' + esc(parts[1] || '—') + '</td>' +
            '<td>¥' + fmtPrice(v * creditCny) + '</td>' +
            '<td>' + availBadge(m) + '</td>' +
            '</tr>');
        });
    }
    if (p.imageTokenPricing) {
      const ip = p.imageTokenPricing;
      rows.push('<tr>' +
        '<td class="l"><span class="mname">' + esc(m.model) + '</span><div class="mnote"><span class="chip">图像 token 计费</span></div></td>' +
        '<td colspan="2" class="l muted" style="white-space:normal">文本 ¥' + fmtPrice((ip.textInputCredits || 0) * creditCny) +
        ' / 图入 ¥' + fmtPrice((ip.imageInputCredits || 0) * creditCny) + ' / 图出 ¥' + fmtPrice((ip.imageOutputCredits || 0) * creditCny) + ' 每百万</td>' +
        '<td>—</td><td>' + availBadge(m) + '</td>' +
        '</tr>');
    }
  });
  $('percall-body').innerHTML = '<table class="pc-table"><thead><tr>' +
    '<th class="l">模型</th><th>质量</th><th>尺寸</th><th>单价 (¥)</th><th>状态</th>' +
    '</tr></thead><tbody>' + (rows.join('') || '<tr><td colspan="5" class="l muted">无</td></tr>') + '</tbody></table>';
}

function renderStatus() {
  const when = state.fetchedAt ? new Date(state.fetchedAt).toLocaleString('zh-CN', { hour12: false }) : '未知时间';
  $('data-status').textContent = '来源：' + state.source + ' · ' + when + ' · 共 ' + state.models.length + ' 个模型 · v' + VERSION;
}

function renderAll() { renderKpis(); renderTable(); renderPerCall(); renderStatus(); renderAssumptions(); }

function renderAssumptions() {
  const c = state.cfg;
  const { tIn, tOut } = calc.splitUsage(c.monthlyTokens);
  $('assumptions').innerHTML =
    '<b>估算口径</b>：你的模型每月约 ' + fmtNum(c.monthlyTokens, 1) + 'M tokens，按输入:输出 = 4:1 拆分为 ' +
    fmtNum(tIn, 1) + 'M 输入 + ' + fmtNum(tOut, 1) + 'M 输出。「预计月成本」= 同样的 token 量在 TokenBom 按积分计费的花费：模型单价来自 API（积分/百万 token，即站面显示的 积分/K ×1000），'
    + '积分按购买价折算（¥' + c.creditPrice + '/100积分，即 1 积分 ¥' + calc.creditCnyOf(c.creditPrice).toFixed(4) +
    '，汇率固定 7.2）。「对比现行花费」= 相对你填写的现行月花费 ' + fmtCNY(c.currentSpend) + ' 的增减。';
}

/* ---------- 导出 ---------- */
function currentRows() { return filtered().map(m => ({ m, d: derived(m, state.cfg) })); }

function downloadCSV() {
  const head = ['model', 'availability', 'input_credits_per_M', 'output_credits_per_M',
    'input_cny_per_M', 'output_cny_per_M', 'blended_cny_per_M', 'est_monthly_cny', 'vs_current_spend',
    'max_input_tokens', 'max_output_tokens', 'output_tps_p50', 'sunset_at', 'replaced_by'];
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const lines = [head.join(',')];
  currentRows().forEach(({ m, d }) => {
    lines.push([m.model, m.availability, m.pricing.inputPriceCredits, m.pricing.outputPriceCredits,
      d.inCny.toFixed(4), d.outCny.toFixed(4), d.blended.toFixed(4), d.monthly.toFixed(2),
      (d.vs * 100).toFixed(1) + '%',
      m.capabilities && m.capabilities.maxInputTokens || '', m.capabilities && m.capabilities.maxOutputTokens || '',
      m.outputTpsP50 == null ? '' : m.outputTpsP50,
      m.sunset && m.sunset.sunsetAt || '', m.sunset && m.sunset.replacedBy || ''].map(q).join(','));
  });
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  a.download = 'tokenbom_prices_' + day + '.csv';
  a.click(); URL.revokeObjectURL(a.href);
  toast('CSV 已下载（' + (lines.length - 1) + ' 行）');
}

function copyMarkdown() {
  const rows = currentRows();
  let md = '| 模型 | 输入 ¥/M | 输出 ¥/M | 混合 ¥/M | 预计月成本(¥) | 对比现行花费 |\n|---|---|---|---|---|---|\n';
  rows.forEach(({ m, d }) => {
    md += '| ' + m.model + ' | ¥' + fmtPrice(d.inCny) + ' | ¥' + fmtPrice(d.outCny) + ' | ¥' + fmtPrice(d.blended) +
      ' | ' + fmtCNY(d.monthly) + ' | ' + (Math.abs(d.vs) < 0.005 ? '≈现行' : calc.deltaPercent(d.vs) + '%') + ' |\n';
  });
  const done = () => toast('已复制 Markdown（' + rows.length + ' 行）');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(md).then(done).catch(() => fallbackCopy(md, done));
  } else fallbackCopy(md, done);
}
function fallbackCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text; document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); done(); } catch (e) { toast('复制失败，请手动选择'); }
  document.body.removeChild(ta);
}

/* ---------- 控件绑定 ---------- */
function bindParams() {
  const c = state.cfg;
  const numbers = { monthlyTokens: 'monthlyTokens', currentSpend: 'currentSpend' };
  const tier = $('creditTier');
  tier.value = String(c.creditPrice);
  tier.addEventListener('change', () => {
    const v = parseFloat(tier.value);
    if (!isNaN(v) && v > 0) { c.creditPrice = v; saveCfg(); renderAll(); }
  });
  for (const [id, key] of Object.entries(numbers)) {
    const el = $(id);
    el.value = c[key];
    el.addEventListener('input', () => {
      const v = parseFloat(el.value);
      if (!isNaN(v) && v >= 0) { c[key] = v; saveCfg(); renderAll(); }
    });
  }
}
function saveCfg() { try { localStorage.setItem(LS_CFG, JSON.stringify(state.cfg)); } catch (e) {} }
function loadCfg() {
  try {
    const c = JSON.parse(localStorage.getItem(LS_CFG) || 'null');
    if (c && typeof c === 'object') for (const k of Object.keys(DEFAULTS))
      if (typeof c[k] === 'number' && c[k] >= 0) state.cfg[k] = c[k];
  } catch (e) {}
}

function bindRest() {
  document.querySelectorAll('thead th.sortable').forEach(th =>
    th.addEventListener('click', () => {
      const k = th.dataset.key;
      if (state.sort.key === k) state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
      else state.sort = { key: k, dir: k === 'model' ? 'asc' : 'asc' };
      renderTable();
    }));
  $('search').addEventListener('input', e => { state.search = e.target.value.trim(); renderTable(); renderKpis(); });
  document.querySelectorAll('#avail-tabs .tab').forEach(tab =>
    tab.addEventListener('click', () => {
      state.avail = tab.dataset.avail;
      document.querySelectorAll('#avail-tabs .tab').forEach(t => {
        const on = t === tab;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      renderTable(); renderKpis();
    }));
  $('hidesunset').addEventListener('change', e => { state.hideSunset = e.target.checked; renderTable(); renderKpis(); });
  $('btn-refresh').addEventListener('click', tryFetch);
  $('btn-refresh-side').addEventListener('click', tryFetch);
  $('btn-theme').addEventListener('click', toggleTheme);
  $('btn-paste').addEventListener('click', openPaste);
  $('btn-paste-close').addEventListener('click', closePaste);
  $('paste-panel').addEventListener('click', e => { if (e.target === $('paste-panel')) closePaste(); });
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); $('search').focus(); }
    if (e.key === 'Escape') closePaste();
  });
  $('btn-csv').addEventListener('click', downloadCSV);
  $('btn-md').addEventListener('click', copyMarkdown);
  $('btn-reset').addEventListener('click', () => {
    state.cfg = { ...DEFAULTS }; saveCfg(); bindParamsValues(); renderAll(); toast('已恢复默认参数');
  });
  $('btn-parse').addEventListener('click', () => parsePasted($('paste-box').value));
  $('btn-clip').addEventListener('click', async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t && t.trim()) parsePasted(t);
      else toast('剪贴板是空的');
    } catch (e) { toast('无法读剪贴板，请 Ctrl+V 粘贴到输入框'); $('paste-box').focus(); }
  });
  const restoreSnap = () => { loadEmbedded(); closePaste(); toast('已恢复内嵌快照'); };
  $('btn-restore').addEventListener('click', restoreSnap);
  $('btn-snapshot').addEventListener('click', restoreSnap);
  $('open-api').href = API_URL;
}
function bindParamsValues() {
  $('creditTier').value = String(state.cfg.creditPrice);
  $('monthlyTokens').value = state.cfg.monthlyTokens;
  $('currentSpend').value = state.cfg.currentSpend;
}

/* ---------- 启动 ---------- */
loadCfg();
bindParams();
bindRest();
if (!loadLocal()) loadEmbedded();
