import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fmtNum, fmtPrice, fmtCNY, fmtTok,
  creditCnyOf, perOutOf, inferUsage, officialBlendedCny, derived,
} from '../src/calc.mjs';

const DEFAULTS = { creditPrice: 0.2, fx: 7.2, officialIn: 5, officialOut: 25, budget: 1200, ratio: 4 };

test('creditCnyOf: 积分购买价换算', () => {
  assert.equal(creditCnyOf(DEFAULTS), 0.002);
  assert.equal(creditCnyOf({ creditPrice: 1 }), 0.01);
  assert.equal(creditCnyOf({ creditPrice: 0 }), 0);
});

test('perOutOf: 官方每 1M 输出对应花费', () => {
  assert.equal(perOutOf(DEFAULTS), 45);
  assert.equal(perOutOf({ ratio: 1, officialIn: 5, officialOut: 25 }), 30);
  assert.equal(perOutOf({ ratio: 20, officialIn: 0, officialOut: 0 }), 0);
});

test('inferUsage: 反推月用量', () => {
  const { tIn, tOut } = inferUsage(DEFAULTS);
  assert.ok(Math.abs(tOut - 1200 / 45) < 1e-9);
  assert.ok(Math.abs(tIn - (1200 / 45) * 4) < 1e-9);
  const zero = inferUsage({ ratio: 4, officialIn: 0, officialOut: 0, budget: 100 });
  assert.equal(zero.tOut, 0);
  assert.equal(zero.tIn, 0);
});

test('officialBlendedCny: 官方混合价', () => {
  assert.ok(Math.abs(officialBlendedCny(DEFAULTS) - (45 / 5) * 7.2) < 1e-9);
  assert.equal(officialBlendedCny(DEFAULTS), 64.8);
});

test('derived: opus-5 锚点模型（积分 500/2500）', () => {
  const m = { pricing: { inputPriceCredits: 500, outputPriceCredits: 2500 } };
  const d = derived(m, DEFAULTS);
  assert.equal(d.inCny, 1.0);
  assert.equal(d.outCny, 5.0);
  assert.ok(Math.abs(d.blended - (4 * 1 + 5) / 5) < 1e-9);
  assert.equal(d.blended, 1.8);
  assert.ok(Math.abs(d.monthly - 1200 * 9 / 45) < 1e-9);
  assert.equal(d.monthly, 240);
  assert.ok(Math.abs(d.vs - (240 / (1200 * 7.2) - 1)) < 1e-12);
  assert.ok(Math.abs(d.vs + 0.9722) < 0.0001);
});

test('derived: 缺失积分数按 0 处理', () => {
  const d = derived({ pricing: {} }, DEFAULTS);
  assert.equal(d.inCny, 0);
  assert.equal(d.outCny, 0);
  assert.equal(d.blended, 0);
  assert.equal(d.monthly, 0);
});

test('derived: budget=0 时 vs 保护为 0', () => {
  const d = derived({ pricing: { inputPriceCredits: 1, outputPriceCredits: 1 } }, { ...DEFAULTS, budget: 0 });
  assert.equal(d.monthly, 0);
  assert.equal(d.vs, 0);
});

test('derived: ratio 极端值下公式稳定', () => {
  const cfg = { ...DEFAULTS, ratio: 20 };
  const m = { pricing: { inputPriceCredits: 100, outputPriceCredits: 5000 } };
  const d = derived(m, cfg);
  assert.ok(Math.abs(d.blended - (20 * 0.2 + 10) / 21) < 1e-9);
  assert.ok(Math.abs(d.monthly - 1200 * (20 * 0.2 + 10) / (20 * 5 + 25)) < 1e-9);
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
