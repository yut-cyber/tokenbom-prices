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

- **月成本估算**：填入你的模型月用量（按 4:1 拆分输入/输出），直接算出各模型的月花费
- **对比现行花费**：每个模型直观显示相对你现行月花费的增减百分比（未填写时显示「—」）
- **积分 → 人民币**：积分售价档位一键切换（¥0.20/0.18/0.16/0.14 每 100 积分），汇率固定 7.2，实时重算
- **模型能力标签**：上下文长度、视觉、工具调用、推理、PDF、提示缓存、输出速度（tps）
- **筛选与排序**：按模型名搜索、按可用状态筛选、点击表头按任意价格列排序
- **导出**：下载 CSV（Excel 友好，UTF-8 BOM）、复制 Markdown 表格
- **离线可用**：内嵌 2026-08-29 数据快照（121 个模型），无网络也能用
- **隐私安全**：所有计算在浏览器本地完成，不收集、不上传任何数据

## 使用方式

**在线版**：直接访问 <https://yut-cyber.github.io/tokenbom-prices/>，无需安装。

**离线版**：从 [Releases](https://github.com/yut-cyber/tokenbom-prices/releases) 下载 `tokenbom-prices-vX.Y.Z.html`，双击用任意现代浏览器（Chrome/Edge/Firefox）打开即可，无需服务器。

## 计算口径

设 `creditPrice`（所选档位 ¥/100积分）、`monthlyTokens`（你的模型月总用量，M tokens）、`currentSpend`（现行月花费 ¥）。汇率固定 7.2，输入:输出固定 4:1：

```
1 积分      = creditPrice / 100 元
输入 ¥/M    = 输入积分 × creditPrice ÷ 100
混合价      = (4 × 输入价 + 输出价) ÷ 5
月用量拆分   = 输入 monthlyTokens × 4/5，输出 monthlyTokens × 1/5
预计月成本  = monthlyTokens × 混合价
对比现行花费 = 月成本 ÷ currentSpend − 1
```

> 计算逻辑实现于 [`src/calc.mjs`](src/calc.mjs)（纯函数），测试见 [`tests/app.test.mjs`](tests/app.test.mjs)。

## 参数说明

| 参数 | 含义 | 默认值 |
|---|---|---|
| 积分售价 | 档位下拉（¥/100积分） | 0.20（可选 0.18 / 0.16 / 0.14） |
| 我的模型月用量 | 你的模型每月 token 总用量（M tokens/月），按 4:1 拆分输入/输出 | 133.3 |
| 现行月花费 | 你现在每月实际花费（¥），作为「对比现行花费」列的基准 | 8640 |
| 美元汇率 | 固定 7.2，不可调 | — |
| 输入:输出 | 固定 4:1，不可调 | — |

参数改动即时重算并保存到浏览器 localStorage，下次打开无需重设。

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
