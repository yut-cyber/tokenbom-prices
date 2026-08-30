import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FX, RATIO, CREDIT_TIERS,
  fmtNum, fmtPrice, fmtCNY, fmtTok,
  creditCnyOf, splitUsage, derived, deltaPercent,
} from '../src/calc.mjs';

const DEFAULTS = { creditPrice: 0.2, monthlyTokens: 133.3, currentSpend: 8640 };

test('常量：汇率/比例/档位', () => {
  assert.equal(FX, 7.2);
  assert.equal(RATIO, 4);
  assert.deepEqual(CREDIT_TIERS, [0.2, 0.18, 0.16, 0.14]);
});

test('creditCnyOf: 积分购买价换算', () => {
  assert.equal(creditCnyOf(0.2), 0.002);
  assert.ok(Math.abs(creditCnyOf(0.14) - 0.0014) < 1e-12);
  assert.equal(creditCnyOf(0), 0);
});

test('splitUsage: 4:1 拆分月用量', () => {
  const { tIn, tOut } = splitUsage(100);
  assert.ok(Math.abs(tIn - 80) < 1e-9);
  assert.ok(Math.abs(tOut - 20) < 1e-9);
  const zero = splitUsage(0);
  assert.equal(zero.tIn, 0);
  assert.equal(zero.tOut, 0);
});

test('derived: opus-5（积分 500/2500，默认档位与用量）', () => {
  const m = { pricing: { inputPriceCredits: 500, outputPriceCredits: 2500 } };
  const d = derived(m, DEFAULTS);
  assert.equal(d.inCny, 1.0);
  assert.equal(d.outCny, 5.0);
  assert.equal(d.blended, 1.8);
  assert.ok(Math.abs(d.monthly - 133.3 * 1.8) < 1e-9);
  assert.ok(Math.abs(d.monthly - 239.94) < 1e-9);
  assert.ok(Math.abs(d.vs - (239.94 / 8640 - 1)) < 1e-12);
  assert.ok(Math.abs(d.vs + 0.9722) < 0.0001);
});

test('derived: 低档位 0.14 时单价更低', () => {
  const m = { pricing: { inputPriceCredits: 500, outputPriceCredits: 2500 } };
  const d = derived(m, { ...DEFAULTS, creditPrice: 0.14 });
  assert.ok(Math.abs(d.inCny - 0.7) < 1e-9);
  assert.ok(Math.abs(d.outCny - 3.5) < 1e-9);
  assert.ok(Math.abs(d.blended - (4 * 0.7 + 3.5) / 5) < 1e-9);
});

test('derived: 缺失积分数按 0 处理', () => {
  const d = derived({ pricing: {} }, DEFAULTS);
  assert.equal(d.inCny, 0);
  assert.equal(d.outCny, 0);
  assert.equal(d.blended, 0);
  assert.equal(d.monthly, 0);
  assert.equal(d.vs, -1);
});

test('derived: 用量为 0 时月成本为 0', () => {
  const d = derived({ pricing: { inputPriceCredits: 1, outputPriceCredits: 1 } }, { ...DEFAULTS, monthlyTokens: 0 });
  assert.equal(d.monthly, 0);
});

test('derived: 现行花费为 0 时 vs 保护为 0', () => {
  const d = derived({ pricing: { inputPriceCredits: 1, outputPriceCredits: 1 } }, { ...DEFAULTS, currentSpend: 0 });
  assert.equal(d.vs, 0);
});

test('derived: vs 正负号（更贵为正）', () => {
  const m = { pricing: { inputPriceCredits: 50000, outputPriceCredits: 250000 } };
  const d = derived(m, { ...DEFAULTS, monthlyTokens: 133.3, currentSpend: 100 });
  assert.ok(d.vs > 0);
});

test('deltaPercent: 百分比文本格式（不含%号，由调用处拼接）', () => {
  assert.equal(deltaPercent(-0.9722), '-97');
  assert.equal(deltaPercent(-0.995), '-99.5');
  assert.equal(deltaPercent(0.0321), '+3');
  assert.equal(deltaPercent(-0.001), '-0');
});

test('fmtNum/fmtPrice: 数字格式化', () => {
  assert.equal(fmtNum(1234.567, 2), '1,234.57');
  assert.equal(fmtPrice(0), '0');
  assert.equal(fmtPrice(0.001), '0.0010');
  assert.equal(fmtPrice(0.5), '0.500');
  assert.equal(fmtPrice(12.345), '12.35');
});

test('fmtCNY: 金额格式化', () => {
  assert.equal(fmtCNY(0), '¥0');
  assert.equal(fmtCNY(0.5), '¥0.50');
  assert.equal(fmtCNY(1234.5), '¥1,234.5');
  assert.equal(fmtCNY(12345.6), '¥12,346');
});

test('fmtTok: token 数缩写', () => {
  assert.equal(fmtTok(null), '');
  assert.equal(fmtTok(500), '500');
  assert.equal(fmtTok(1500), '2K');
  assert.equal(fmtTok(1000000), '1M');
  assert.equal(fmtTok(1500000), '1.5M');
});
