# 参与 ZhuàngTài / Contributing to ZhuàngTài

## 中文

感谢你愿意帮助 ZhuàngTài。使用问题和设计想法请先在 [Discussions](https://github.com/zhuangtai-js/ZhuangTai/discussions) 交流；可复现缺陷再提交 Issue。

### 开发环境

- Node.js 24
- pnpm 11.10.0（以根目录 `packageManager` 为准）

```sh
git clone git@github.com:zhuangtai-js/ZhuangTai.git
cd ZhuangTai
pnpm install
pnpm check
```

### 修改原则

- 保持 `set` 立即生效、`watch` 同步执行、`Object.is` 相等判断和引用语义。
- Core 不添加隐藏调度、batching、transaction、debounce，也不添加第三方运行时依赖。
- 每个公开文档变更都必须先写中文，再同步英文；两种语言的结构、API 与含义保持一致。
- 一个 PR 只解决一个明确问题。行为修改应提供测试或可复现的验证证据。
- 发布包版本相互独立，不要为了对齐而统一提升所有包版本。

### 提交 PR

1. 从 `main` 创建分支。
2. 完成最小且完整的修改。
3. 运行 `pnpm check`；发布相关修改还要运行 `pnpm release:test` 和 `pnpm release:dry-run -- --channel stable`。
4. 在 PR 中说明动机、兼容性影响与手动验证结果。

## English

Thank you for helping ZhuàngTài. Start usage questions and design ideas in [Discussions](https://github.com/zhuangtai-js/ZhuangTai/discussions); open an issue for a reproducible defect.

### Development environment

- Node.js 24
- pnpm 11.10.0, as declared by the root `packageManager`

```sh
git clone git@github.com:zhuangtai-js/ZhuangTai.git
cd ZhuangTai
pnpm install
pnpm check
```

### Change principles

- Preserve immediate `set`, synchronous `watch`, `Object.is` equality, and reference-based object and array semantics.
- Do not add hidden scheduling, batching, transactions, debouncing, or third-party runtime dependencies to Core.
- Write every public documentation change in Chinese first, then mirror it in English with the same structure, API, and meaning.
- Keep each PR focused on one clear problem. Behavioral changes should include tests or reproducible verification evidence.
- Package versions are independent; do not bump every package merely to align versions.

### Opening a PR

1. Create a branch from `main`.
2. Make the smallest complete change.
3. Run `pnpm check`; for release changes also run `pnpm release:test` and `pnpm release:dry-run -- --channel stable`.
4. Describe the motivation, compatibility impact, and manual verification in the PR.
