# TokenBom 模型价格榜 · 月成本估算

A single-file, zero-dependency web tool that converts TokenBom's credit-based model pricing into CNY and estimates your monthly cost versus your official API bill. / 一个把 [TokenBom](https://tokenbom.com/dashboard) 积分制模型价格换算成人民币、并与官方 API 月账单对比估算成本的单文件纯前端工具。

![Online](https://img.shields.io/badge/在线使用-yut--cyber.github.io-4f46e5) ![CI](https://github.com/yut-cyber/tokenbom-prices/actions/workflows/ci.yml/badge.svg) [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE) ![Node](https://img.shields.io/badge/node-%E2%89%A520-brightgreen)

**🌐 在线使用（推荐）**：<https://yut-cyber.github.io/tokenbom-prices/>

## 目录

- [功能特性](#功能特性)
- [使用方式](#使用方式)
- [计算口径](#计算口径)
- [参数说明](#参数说明)
- [更新价格数据](#更新价格数据)
- [开发](#开发)
- [License](#license)

## 功能特性

- **月成本估算**：以你的官方 API 月账单为锚点，按输入:输出比反推月用量，估算同样的 token 量在各模型上的月花费
- **对比官方账单**：每个模型直观显示相对官方账单的增减百分比（锚点模型金色高亮）
- **积分 → 人民币**：积分单价、美元汇率、官方单价全部可调，实时重算
- **模型能力标签**：上下文长度、视觉、工具调用、推理、PDF、提示缓存、输出速度（tps）
- **筛选与排序**：按模型名搜索、按可用状态筛选、点击表头按任意价格列排序
- **导出**：下载 CSV（Excel 友好，UTF-8 BOM）、复制 Markdown 表格
- **离线可用**：内嵌 2026-08-29 数据快照（121 个模型），无网络也能用
- **隐私安全**：所有计算在浏览器本地完成，不收集、不上传任何数据

## 使用方式

**在线版**：直接访问 <https://yut-cyber.github.io/tokenbom-prices/>，无需安装。

**离线版**：从 [Releases](https://github.com/yut-cyber/tokenbom-prices/releases) 下载 `tokenbom-prices-vX.Y.Z.html`，双击用任意现代浏览器（Chrome/Edge/Firefox）打开即可，无需服务器。

## 计算口径

设 `creditPrice`（¥/100积分）、`fx`（汇率）、`officialIn/officialOut`（官方 $/M 输入/输出）、`budget`（月锚点花费 $）、`ratio`（输入:输出）：

```
1 积分      = creditPrice / 100 元
输入 ¥/M    = 输入积分 × creditPrice ÷ 100
混合价      = (ratio × 输入价 + 输出价) ÷ (ratio + 1)
预计月成本  = budget × (ratio × 输入价 + 输出价) ÷ (ratio × officialIn + officialOut)
对比官方账单 = 月成本 ÷ (budget × fx) − 1
```

月用量反推：`tOut = budget ÷ (ratio × officialIn + officialOut)`，`tIn = tOut × ratio`。

> 计算逻辑实现于 [`src/calc.mjs`](src/calc.mjs)（纯函数），测试见 [`tests/app.test.mjs`](tests/app.test.mjs)。

## 参数说明

| 参数 | 含义 | 默认值 |
|---|---|---|
| 积分售价 | TokenBom 充值标价（¥/100积分） | 0.2 |
| 美元汇率 | 1 USD = X CNY | 7.2 |
| 官方 Opus 5 单价 | 官方 API 价格（$/M tokens） | 输入 5 / 输出 25 |
| 月锚点花费 | 每月官方 API 账单（USD），估算基准 | 1200 |
| 输入:输出 | token 用量中输入与输出的比例 | 4:1 |

所有参数改动即时重算并保存到浏览器 localStorage，下次打开无需重设。

## 更新价格数据

1. **自动拉取**：点顶部「🔄 拉取最新价格」，请求 `https://tokenbom.com/api/models`
2. **手动粘贴**（浏览器拦截跨域 CORS 时的备用方案，约 10 秒）：在弹出的黄色面板打开 API 数据页 → `Ctrl+A` 全选复制 → 回到本页 `Ctrl+V` → 「解析并更新」
3. **恢复快照**：点「恢复内嵌快照」回到出厂内嵌数据

更新仓库内的快照：替换 [`src/data/snapshot.json`](src/data/snapshot.json)（结构 `{"fetchedAt": "...", "models": [...]}`）后执行 `npm run build` 并提交。

## 开发

零 npm 依赖，只需 Node ≥ 20（利用其内置 test runner）。

```bash
npm run check   # 语法检查（src/app.js / src/calc.mjs / scripts/build.mjs）
npm test        # 运行单元测试（node --test）
npm run build   # 构建：src/ + 快照 → 内联为根目录单文件 index.html
```

### 目录结构

```
├── index.html              # 构建产物（单文件，GitHub Pages 部署它）——勿手改
├── src/
│   ├── index.html          # HTML 模板（含构建占位符）
│   ├── styles.css          # 样式
│   ├── calc.mjs            # 纯计算层（积分换算/月成本/格式化，可独立测试）
│   ├── app.js              # 界面逻辑（构建时注入 calc 与数据）
│   └── data/snapshot.json  # 内嵌数据快照
├── scripts/build.mjs       # 构建脚本
├── tests/app.test.mjs      # 单元测试
└── .github/workflows/      # CI（检查+测试+构建一致性）与 Pages 自动部署
```

**工作流**：改 `src/` 下源文件 → `npm run build` → 提交（CI 会校验 `index.html` 与源码构建结果一致，防止忘记重新构建）。

## License

[MIT](LICENSE) © 2026 yut-cyber
