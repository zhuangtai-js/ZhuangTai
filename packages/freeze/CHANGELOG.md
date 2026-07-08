# freeze 更新日志 / Changelog

## 0.1.0 - 2026-07-08

### 新增

- 首个发布：`@zhuangtai-js/freeze`，为 `createAtom()` 创建的 atom 提供开发期深冻结插件。
- 在提交前对初始值和每次 `set` 的值执行 `Object.freeze` 深冻结，让误改状态内部字段在严格模式下立即抛错，而不是因引用相等被静默忽略。
- 默认在 `NODE_ENV === "production"` 时降级为无操作，生产环境零开销；可通过 `enabled` 选项显式开关。

### Added

- Initial release: `@zhuangtai-js/freeze`, a development-time deep-freeze plugin for atoms created with `createAtom()`.
- Deep-freezes the initial value and every `set` value with `Object.freeze` before committing, so accidental mutation of state internals throws in strict mode instead of being silently ignored by reference equality.
- Defaults to a no-op when `NODE_ENV === "production"` for zero production overhead; toggle explicitly with the `enabled` option.
