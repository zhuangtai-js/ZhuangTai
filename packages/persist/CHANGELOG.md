# persist 更新日志 / Changelog

## 0.2.1 - 2026-07-02

### 变更

- 将 npm 发布入口从通用 Release workflow 拆分为专用的 `npm Publish` workflow。
- 发布脚本改为先生成包 tarball，再使用 npm CLI 发布 tarball，便于使用 npm Trusted Publishing。
- 更新维护者发布说明，发布入口改为 GitHub Actions > npm Publish，并移除对长期 `NPM_TOKEN` 的依赖。

### Changed

- Split npm publishing from the generic Release workflow into a dedicated `npm Publish` workflow.
- Changed the publish script to pack the package first and publish the generated tarball with the npm CLI, preparing for npm Trusted Publishing.
- Updated maintainer release notes to use GitHub Actions > npm Publish and remove the long-lived `NPM_TOKEN` dependency.

## 0.2.0 - 2026-06-30

### 新增

- 新增私有 `@zhuangtai-js/test` 工作区，用于单元、可靠性和浏览器冒烟测试。
- 新增 package entrypoint 的 public API 类型测试。
- 新增 packed tarball consumer 冒烟测试，覆盖运行时和 TypeScript 使用。
- 新增真实 Chromium 浏览器冒烟测试，覆盖 `persist` 与 `localStorage`。

### 变更

- 将 persist 测试集中到 `@zhuangtai-js/test`，并让测试使用 public package imports。
- 简化 `PersistStorage`，自定义 storage 需要实现 Web Storage 风格的 `getItem`、`setItem` 和 `removeItem`。

### 修复

- 让默认 persist JSON codec 拒绝 `JSON.stringify` 无法编码为字符串的值。

### Added

- Added the private `@zhuangtai-js/test` workspace for unit, reliability, and browser smoke tests.
- Added public API type tests for package entrypoints.
- Added packed-tarball consumer smoke tests for runtime and TypeScript usage.
- Added a real Chromium browser smoke test for `persist` with `localStorage`.

### Changed

- Centralized persist tests under `@zhuangtai-js/test` and made tests exercise public package imports.
- Simplified `PersistStorage` so custom storage implements Web Storage-style `getItem`, `setItem`, and `removeItem`.

### Fixed

- Made the default persist JSON codec reject values that `JSON.stringify` cannot encode as strings.
