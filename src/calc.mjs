export const FX = 7.2;                                // 固定汇率：1 USD = 7.2 CNY
export const RATIO = 4;                               // 固定输入:输出 = 4:1
export const CREDIT_TIERS = [0.2, 0.18, 0.16, 0.14];  // 积分售价档位（¥/100积分）

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

export function creditCnyOf(creditPrice) {
  return creditPrice / 100;
}

export function splitUsage(monthlyTokens) {
  return {
    tIn: monthlyTokens * RATIO / (RATIO + 1),
    tOut: monthlyTokens / (RATIO + 1),
  };
}

export function derived(m, cfg) {
  const creditCny = creditCnyOf(cfg.creditPrice);               // ¥/积分（购买价）
  const inCny = (m.pricing.inputPriceCredits || 0) * creditCny; // ¥/百万token
  const outCny = (m.pricing.outputPriceCredits || 0) * creditCny;
  const blended = (RATIO * inCny + outCny) / (RATIO + 1);
  const monthly = cfg.monthlyTokens * blended;                  // ¥/月 = tIn×in + tOut×out
  const vs = cfg.currentSpend > 0 ? monthly / cfg.currentSpend - 1 : 0;
  return { inCny, outCny, blended, monthly, vs };
}

export function deltaPercent(vs) {
  const pct = vs * 100;
  const rounded = Math.round(Math.abs(pct));
  const digits = rounded >= 99 ? 1 : 0; // 接近±100%时保留一位小数，避免误读为免费
  return (pct > 0 ? '+' : '') + pct.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
