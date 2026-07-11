# core 更新日志 / Changelog

## 0.4.1 - 2026-07-11

### 修复

- 修复 watched computed 的通知基线：主动调用 `.get()` 不再吞掉后续同步 watcher 通知，diamond 依赖图中的 sibling 也不会因订阅顺序而漏事件。
- 修复 computed watcher 同步修改另一依赖时的重入通知顺序；每轮 watcher 都会收到稳定的当前值和前值，重入更新会在当前一轮结束后继续同步传播。
- derive 抛错时保留本次已经读取的依赖，使依赖修复后可以自动恢复通知；derive 仍失败时，新增 watcher 会直接收到错误，而不是陈旧缓存值。

### 说明

- `computed` 仍然同步传播，不引入异步调度、批处理或事务。
- 相等性仍使用 `Object.is`。

### Fixed

- Fixed the notification baseline for watched computed values: an explicit `.get()` no longer suppresses the following synchronous watcher notification, and sibling nodes in a diamond dependency graph no longer lose events based on subscription order.
- Fixed reentrant notification ordering when a computed watcher synchronously changes another dependency. Every notification round now uses a stable current/previous pair, and reentrant updates continue synchronously after the current round finishes.
- Preserved dependencies read by a failing derive so notifications can recover automatically after those dependencies are repaired. Adding a watcher while the derive still fails now throws the derive error instead of emitting a stale cached value.

### Notes

- `computed` propagation remains synchronous and does not introduce asynchronous scheduling, batching, or transactions.
- Equality continues to use `Object.is`.

## 0.4.0 - 2026-07-09

### 新增

- 新增 atom 形态注册表，让 creator 插件可以在类型层拓宽 atom 的公共接口。插件可通过可选的 `kind` 字段声明自己的形态，`createAtom().use(plugin)` 会把该形态带到最终 atom 的类型上（例如 Immer 插件让 `set` 接受“修改草稿”的 recipe）。
- 新增公共类型 `AtomKindRegistry`、`AtomKind` 和 `AtomOf`，供插件通过 `declare module` 注册自定义 atom 形态。

### 说明

- 纯类型层改动，零运行时开销，不改变任何 core 语义（`set` 立即生效、`watch` 同步、`Object.is` 相等性均不变）。
- 向后兼容：`kind` 为可选字段，现有插件无需修改；未声明 `kind` 的插件继续产出默认的 `Atom<Value>`。

### Added

- Added an atom-kind registry so creator plugins can widen an atom's public interface at the type level. A plugin declares its kind via the optional `kind` field, and `createAtom().use(plugin)` carries that kind through to the resulting atom's type (for example, the Immer plugin makes `set` accept a "mutate the draft" recipe).
- Added public types `AtomKindRegistry`, `AtomKind`, and `AtomOf` so plugins can register custom atom kinds through `declare module`.

### Notes

- A type-only change with zero runtime overhead; it does not alter any core semantics (`set` applies immediately, `watch` is synchronous, equality uses `Object.is`).
- Backward compatible: `kind` is optional, existing plugins need no changes, and plugins that do not declare a `kind` continue to produce the default `Atom<Value>`.

## 0.3.0 - 2026-07-07

### 重大变更

- `computed` 改为自动依赖追踪的单一写法。derive 是一个无参函数，通过在函数体内调用 atom 的 `.get()` 自动发现依赖，不再需要显式声明来源或对齐参数顺序。
  - 迁移：`computed(count, (value) => value * 2)` 改为 `computed(() => count.get() * 2)`；`computed([a, b] as const, (av, bv) => av + bv)` 改为 `computed(() => a.get() + b.get())`。
  - 移除了旧的两个重载与公共类型 `AtomValues`（`AtomValue` 保留）。

### 新增

- `computed` 支持动态依赖：`computed(() => flag.get() ? a.get() : b.get())` 会在 `flag` 翻转时自动退订旧分支、订阅新分支。
- 自读的 computed 会抛出清晰的循环错误，而不是栈溢出。

### 说明

- 依赖追踪仅在同步 derive 内有效；`await` 之后或 `setTimeout` 内的 `.get()` 不会被追踪。
- 嵌套 computed 的依赖是隔离的：外层读取 `inner.get()` 只依赖 `inner` 本身，不依赖 `inner` 的内部来源。
- 通知模型不变：同步 push、无批处理、`Object.is` 相等性；本次改动只改变依赖如何被发现，不改变何时通知。

### Breaking Changes

- `computed` now uses a single auto-tracking writing style. The derive is a zero-argument function, and dependencies are discovered automatically from the atom `.get()` calls made inside it — no more declaring sources or aligning argument order.
  - Migration: `computed(count, (value) => value * 2)` becomes `computed(() => count.get() * 2)`; `computed([a, b] as const, (av, bv) => av + bv)` becomes `computed(() => a.get() + b.get())`.
  - Removed the two old overloads and the public `AtomValues` type (`AtomValue` is kept).

### Added

- `computed` supports dynamic dependencies: `computed(() => flag.get() ? a.get() : b.get())` unsubscribes the old branch and subscribes the new one when `flag` flips.
- A computed that reads itself throws a clear cycle error instead of overflowing the stack.

### Notes

- Dependency tracking only works within the synchronous derive; a `.get()` after `await` or inside `setTimeout` is not tracked.
- Nested computed dependencies are isolated: an outer computed reading `inner.get()` depends on `inner` itself, not on `inner`'s internal sources.
- The notification model is unchanged: synchronous push, no batching, `Object.is` equality. This change only alters how dependencies are discovered, not when notifications happen.

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
