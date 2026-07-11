# freeze 更新日志 / Changelog

## 0.2.0 - 2026-07-11

### 变更

- 将 `@zhuangtai-js/core` peer dependency 更新为 `^0.5.0`，声明与本次 core 0.5.x 发布线的兼容范围。

### 说明

- 本次更新只修正安装兼容声明，不改变 freeze 的运行时语义。

### Changed

- Updated the `@zhuangtai-js/core` peer dependency to `^0.5.0`, declaring compatibility with the core 0.5.x release line.

### Notes

- This update only corrects installation compatibility metadata. It does not change freeze runtime semantics.

## 0.1.0 - 2026-07-08

### 新增

- 首个发布：`@zhuangtai-js/freeze`，为 `createAtom()` 创建的 atom 提供开发期深冻结插件。
- 在提交前对初始值和每次 `set` 的值执行 `Object.freeze` 深冻结，让误改状态内部字段在严格模式下立即抛错，而不是因引用相等被静默忽略。
- 默认在 `NODE_ENV === "production"` 时降级为无操作，生产环境零开销；可通过 `enabled` 选项显式开关。

### Added

- Initial release: `@zhuangtai-js/freeze`, a development-time deep-freeze plugin for atoms created with `createAtom()`.
- Deep-freezes the initial value and every `set` value with `Object.freeze` before committing, so accidental mutation of state internals throws in strict mode instead of being silently ignored by reference equality.
- Defaults to a no-op when `NODE_ENV === "production"` for zero production overhead; toggle explicitly with the `enabled` option.
