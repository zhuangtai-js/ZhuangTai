# persist 更新日志 / Changelog

## 0.5.0 - 2026-07-16

### 新增

- `PersistStorage` 现在是通用的结构化同步或异步 storage 契约；`getItem`、`setItem` 和 `removeItem` 每次调用都接受普通返回值或 `PromiseLike` 返回值，同一个 storage 可以混合两种结果。
- 异步 storage 支持确定性的 hydration 生命周期与 controller：`persist.ready`、`persist.flush`、`persist.rehydrate` 和 `persist.clear`。
- 异步写入按本地更新顺序串行执行；写入失败会保留、通过 `onError` 报告，并在 `flush` 中可观察，后续写入仍会继续。

### 语义

- 异步 hydration 先使用 `initialValue`；本地更新在读取竞态中获胜，过期 hydration generation 不会覆盖新结果，最新本地值会在读取完成后写入。
- migration 回调继续同步、按连续版本顺序执行；异步 storage 只让读取和 migration write-back 异步，并在 write-back 完成后才提交迁移值和 resolve `ready`。
- 同步 storage 保持原有的 restore-before-return、write-before-commit、同步 watcher 与 `Object.is` no-op 语义。异步 `set()` 仍同步提交内存值；队列中延后的 `setItem` 抛错属于异步失败，由 `onError` 与 `flush` 报告。

### 错误处理

- 异步 hydration、异步或排队写入、migration write-back、`rehydrate` 和 `clear` 失败都带有 package、operation 与 key 上下文；原始错误保留在 `cause`。
- atom creator 或本地 `set()` 的原始同步调用路径会同步 fail-closed；`rehydrate` 与 `clear` 始终通过 lifecycle Promise reject。这些 lifecycle 与队列失败由 `onError` 按操作报告，并由 `flush` 暴露第一条保留失败后清空这批失败。

### Added

- `PersistStorage` is now a generic structural sync-or-async storage contract. Each `getItem`, `setItem`, and `removeItem` call accepts either a plain result or a `PromiseLike` result, so one storage object may mix both result kinds.
- Asynchronous storage now has deterministic hydration lifecycle controls through `persist.ready`, `persist.flush`, `persist.rehydrate`, and `persist.clear`.
- Asynchronous writes are serialized in local-update order. Failures are retained, reported through `onError`, and exposed by `flush`; later writes continue.

### Semantics

- Asynchronous hydration starts from `initialValue`; local updates win hydration races, stale hydration generations cannot overwrite newer results, and the latest local value is written after the read completes.
- Migration callbacks remain synchronous and run through consecutive versions in order. With asynchronous storage, only reads and migration write-back become asynchronous; the migrated value is committed and `ready` resolves after write-back completes.
- Synchronous storage keeps the existing restore-before-return, write-before-commit, synchronous watcher, and `Object.is` no-op semantics. An asynchronous-storage `set()` still commits memory synchronously; a deferred `setItem` throw is an asynchronous failure reported by `onError` and `flush`.

### Error handling

- Asynchronous hydration, asynchronous or queued writes, migration write-back, `rehydrate`, and `clear` failures include package, operation, and key context; the original error is preserved in `cause`.
- The original synchronous call paths of the atom creator and local `set()` fail closed synchronously; `rehydrate` and `clear` always reject through lifecycle Promises. `onError` reports each lifecycle or queued failure, and `flush` exposes the first retained failure before clearing that batch.

## 0.4.0 - 2026-07-13

### 新增

- 新增可选的 `version` 和逐版本 `migrations`，支持把无标记旧数据作为版本 `0` 同步前向迁移。
- 新增 `PersistMigration` 类型和运行时 identity helper `definePersistMigration<Value>`，用于在不让插件选项依赖 atom `Value` 泛型的前提下声明迁移输入类型。
- 版本化记录使用精确的带标记 JSON envelope 保存版本和 codec payload；迁移成功后会先编码并写回当前版本，再解码得到内存值。

### 安全性

- `version` 必须是正安全整数。未来版本、缺失迁移和格式错误的带标记记录会同步失败。
- 版本化 encode、decode、迁移和 storage 写入错误会保留原始 `cause`，并包含 key 与相关版本上下文。
- 版本化更新和迁移写回继续遵循 storage-before-memory：写入失败时不会提交内存状态。
- 未传 `version` 时，原始存储字节和现有行为保持不变。

### Added

- Added opt-in `version` and per-version `migrations`, treating unmarked legacy data as version `0` for synchronous forward migration.
- Added the `PersistMigration` type and runtime identity helper `definePersistMigration<Value>` so migration input types can be declared without making plugin options depend on the atom's `Value` generic.
- Versioned records use an exact marked JSON envelope containing the version and codec payload; successful migrations encode and write back the current version before decoding the in-memory value.

### Safety

- `version` must be a positive safe integer. Future versions, missing migrations, and malformed marked records fail synchronously.
- Versioned encode, decode, migration, and storage-write errors preserve the original `cause` and include key and relevant version context.
- Versioned updates and migration write-back retain storage-before-memory ordering: failed writes do not commit in-memory state.
- Without `version`, raw storage bytes and existing behavior remain unchanged.

## 0.3.1 - 2026-07-12

### 修复

- 默认 JSON codec 在 encode 前拒绝 `NaN`、`±Infinity` 和无效 `Date`，避免 JSON 把它们静默写成 `null`。需要这些值时请使用自定义 codec。

### Fixed

- The default JSON codec now rejects `NaN`, `±Infinity`, and invalid `Date` values before encode, so JSON cannot silently store them as `null`. Use a custom codec when you need those values.

## 0.3.0 - 2026-07-11

### 修复

- 持久化更新现在先完成编码和 `storage.setItem`，成功后才提交内存 atom。编码或 storage 写入失败时，内存值保持不变，避免内存与持久化数据分叉。

### 变更

- 将 `@zhuangtai-js/core` peer dependency 更新为 `^0.5.0`，声明与本次 core 0.5.x 发布线的兼容范围。

### 说明

- `set` 仍然同步执行；storage 写入、内存提交和 watcher 通知都在同一次调用中完成。
- 除安装兼容声明外，本次版本不改变 codec 语义。

### Fixed

- Persistence updates now complete encoding and `storage.setItem` before committing the in-memory atom. If encoding or storage writing fails, the in-memory value remains unchanged, preventing memory and persisted data from diverging.

### Changed

- Updated the `@zhuangtai-js/core` peer dependency to `^0.5.0`, declaring compatibility with the core 0.5.x release line.

### Notes

- `set` remains synchronous; the storage write, in-memory commit, and watcher notification all complete within the same call.
- Apart from the installation compatibility declaration, this release does not change codec semantics.

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
