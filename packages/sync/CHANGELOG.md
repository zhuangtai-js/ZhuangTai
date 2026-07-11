# sync 更新日志 / Changelog

## 0.2.1 - 2026-07-12

### 修复

- 默认 JSON codec 在 encode 前拒绝 `NaN`、`±Infinity` 和无效 `Date`，避免 JSON 把它们静默变成 `null` 再广播。
- 本地更新改为先 encode，成功后再提交内存并广播；encode 失败时内存保持不变。
- 远端 decode 失败会被隔离：不更新本地状态，不把异常抛出事件回调，并通过 `console.error` 输出诊断信息。

### Fixed

- The default JSON codec now rejects `NaN`, `±Infinity`, and invalid `Date` values before encode, so JSON cannot silently turn them into `null` before broadcast.
- Local updates encode first, then commit memory and broadcast; if encode fails, memory stays unchanged.
- Remote decode failures are isolated: local state is unchanged, the error does not escape the message handler, and a diagnostic is written with `console.error`.

## 0.2.0 - 2026-07-11

### 变更

- 将 `@zhuangtai-js/core` peer dependency 更新为 `^0.5.0`，声明与本次 core 0.5.x 发布线的兼容范围。

### 说明

- 本次更新只修正安装兼容声明，不改变本地广播、远端写入或 SSR 降级语义。

### Changed

- Updated the `@zhuangtai-js/core` peer dependency to `^0.5.0`, declaring compatibility with the core 0.5.x release line.

### Notes

- This update only corrects installation compatibility metadata. It does not change local broadcast, remote write, or SSR fallback semantics.

## 0.1.0 - 2026-07-09

### 新增

- 首个发布：`@zhuangtai-js/sync`，为 `createAtom()` 创建的 atom 提供跨上下文同步插件。
- 通过 `BroadcastChannel` 在同源的多个标签页、窗口或 worker 之间同步 atom 状态；本地更新提交后广播，收到远端广播时直接写入底层状态而不再二次广播，避免回环。
- 支持自定义 `channel` 与 `codec`；默认使用按 `key` 命名的 `BroadcastChannel` 和 JSON codec。
- SSR 或不支持 `BroadcastChannel` 的运行时会静默降级为普通 atom，不报错。
- 默认创建的 `BroadcastChannel` 在 Node 等支持 `unref` 的运行时中不会阻止进程退出；进程存活期间同步照常工作。
- 零第三方运行时依赖。

### Added

- Initial release: `@zhuangtai-js/sync`, a cross-context sync plugin for atoms created with `createAtom()`.
- Synchronizes atom state across same-origin tabs, windows, or workers through `BroadcastChannel`; local updates broadcast after they commit, and incoming broadcasts write straight to the underlying state without re-broadcasting, avoiding echo loops.
- Supports a custom `channel` and `codec`; defaults to a `BroadcastChannel` named after `key` and a JSON codec.
- Silently degrades to a plain atom under SSR or runtimes without `BroadcastChannel`, without throwing.
- The default `BroadcastChannel` is unref'ed on runtimes that support it (such as Node), so a synced atom never blocks process exit; sync keeps working for the lifetime of the process.
- No third-party runtime dependencies.
