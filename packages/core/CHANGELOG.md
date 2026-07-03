# core 更新日志 / Changelog

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

- 新增 Starlight 文档站，默认语言为中文，并提供英文内容。
- 新增私有 `@zhuangtai-js/test` 工作区，用于单元、可靠性和浏览器冒烟测试。
- 新增 package entrypoint 的 public API 类型测试。
- 新增 package manifest、构建产物和 consumer 冒烟检查。
- 新增 packed tarball consumer 冒烟测试，覆盖运行时和 TypeScript 使用。
- 新增真实 Chromium 浏览器冒烟测试，覆盖 core primitives。

### 变更

- 将 core 测试集中到 `@zhuangtai-js/test`，并让测试使用 public package imports。
- 从 `@zhuangtai-js/core` package entrypoint 隐藏内部 atom creator 类型 plumbing。

### 修复

- 修复 `computed.watch()`，使初始 watcher 调用会在未监听 source 变化后读取新派生值。
- 阻止同一个 atom 正在通知 watcher 时发生 self-reentrant `set()`。

### Added

- Added the Starlight docs site with Chinese as the default language and English content.
- Added the private `@zhuangtai-js/test` workspace for unit, reliability, and browser smoke tests.
- Added public API type tests for package entrypoints.
- Added build artifact checks for package manifests and built consumer smoke coverage.
- Added packed-tarball consumer smoke tests for runtime and TypeScript usage.
- Added a real Chromium browser smoke test for core primitives.

### Changed

- Centralized core tests under `@zhuangtai-js/test` and made tests exercise public package imports.
- Hid internal atom creator type plumbing from the `@zhuangtai-js/core` package entrypoint.

### Fixed

- Fixed `computed.watch()` so its initial watcher call reads a fresh derived value after unwatched source changes.
- Prevented atom self-reentrant `set()` calls while the same atom is notifying watchers.

## 0.1.0 - 2026-06-30

### 新增

- 新增 `@zhuangtai-js/core`，包含 `atom`、`computed` 和 `createAtom`。

### Added

- Added `@zhuangtai-js/core` with `atom`, `computed`, and `createAtom`.
