# sync 更新日志 / Changelog

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
