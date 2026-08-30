# Changelog

本项目的所有重要变更将记录在此文件中。
格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本遵循[语义化版本](https://semver.org/lang/zh-CN/)。

## [1.0.0] - 2026-08-30

### Added

- 项目化改造：源码分离为 `src/`（模板 / 样式 / 纯计算层 / 界面逻辑 / 数据快照）
- 零依赖构建脚本 `scripts/build.mjs`：`src/` + 快照 → 内联为根目录单文件 `index.html`
- 单元测试（Node 内置 test runner）：覆盖积分换算、混合价、月成本、官方账单对比、格式化等 11 组用例
- CI：语法检查 + 测试 + 构建，并校验提交的 `index.html` 与源码构建结果一致
- GitHub Pages 自动部署（GitHub Actions）
- 页面状态栏显示工具版本号（与 `package.json` 同步）
- favicon（内联 SVG）与 meta description
- 完整 README（使用方式 / 计算口径 / 参数说明 / 开发指南）与 MIT License

### Changed

- 计算逻辑抽取为纯函数模块 `src/calc.mjs`，行为与 1.0.0 之前的单文件版本完全一致
- 数据快照独立为 `src/data/snapshot.json`，更新价格不再需要改动代码

### 数据快照

- 内嵌快照：2026-08-29（121 个模型），来自 `https://tokenbom.com/api/models`
