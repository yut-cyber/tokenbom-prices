export const fmtNum = (v, d) => v.toLocaleString('en-US', { maximumFractionDigits: d });
export const fmtPrice = v => v === 0 ? '0' : v < 0.01 ? v.toFixed(4) : v < 1 ? v.toFixed(3) : fmtNum(v, 2);
export const fmtCNY = v => {
  if (v === 0) return '¥0';
  if (v < 1) return '¥' + v.toFixed(2);
  if (v < 10000) return '¥' + fmtNum(v, 2);
  return '¥' + fmtNum(Math.round(v), 0);
};
export const fmtTok = n => n == null ? '' : n >= 1e6 ? (n / 1e6).toLocaleString('en-US', { maximumFractionDigits: 1 }) + 'M'
  : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(n);

export function creditCnyOf(cfg) {
  return cfg.creditPrice / 100;
}

export function perOutOf(cfg) {
  return cfg.ratio * cfg.officialIn + cfg.officialOut;
}

export function inferUsage(cfg) {
  const perOut = perOutOf(cfg);
  const tOut = perOut > 0 ? cfg.budget / perOut : 0;
  return { tIn: tOut * cfg.ratio, tOut };
}

export function officialBlendedCny(cfg) {
  return perOutOf(cfg) / (cfg.ratio + 1) * cfg.fx;
}

export function derived(m, cfg) {
  const creditCny = creditCnyOf(cfg);                           // ¥/积分（购买价）
  const inCny = (m.pricing.inputPriceCredits || 0) * creditCny; // ¥/百万token
  const outCny = (m.pricing.outputPriceCredits || 0) * creditCny;
  const blended = (cfg.ratio * inCny + outCny) / (cfg.ratio + 1);
  const monthly = cfg.budget * (cfg.ratio * inCny + outCny) / perOutOf(cfg);  // ¥/月
  const vs = cfg.budget > 0 ? monthly / (cfg.budget * cfg.fx) - 1 : 0;
  return { inCny, outCny, blended, monthly, vs };
}
