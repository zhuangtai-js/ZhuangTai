# immer 更新日志 / Changelog

## 0.1.1 - 2026-07-11

### 变更

- 将 `@zhuangtai-js/core` peer dependency 收紧为 `^0.4.0`，与插件所使用的 core 0.4 atom kind 类型扩展保持一致。

### 说明

- 本次更新只修正安装兼容声明，不改变 Immer recipe setter 或运行时语义。

### Changed

- Narrowed the `@zhuangtai-js/core` peer dependency to `^0.4.0`, matching the core 0.4 atom-kind type extension used by the plugin.

### Notes

- This update only corrects installation compatibility metadata. It does not change the Immer recipe setter or runtime semantics.

## 0.1.0 - 2026-07-08

### 新增

- 首个发布：`@zhuangtai-js/immer`，为 `createAtom()` 创建的 atom 提供 Immer 插件。
- 通过 Immer 的 `produce` 运行 updater 函数，让你可以用直接“修改草稿”的写法完成不可变更新，插件会在提交前产出新引用。
- 兼容“修改草稿并返回”和“直接返回新值”两种 recipe 写法；直接传入的具体值不经过 Immer，行为与 core 一致。
- `createAtom().use(immer)` 产出的 atom 类型与普通 atom 不同：其 `set` 接受直接“修改草稿”的 recipe（可返回 void），也仍然接受具体值。

### Added

- Initial release: `@zhuangtai-js/immer`, an Immer plugin for atoms created with `createAtom()`.
- Runs updater functions through Immer's `produce`, so you can write immutable updates by directly "mutating a draft" while the plugin produces a new reference before committing.
- Supports both the "mutate the draft and return it" and "return a new value" recipe styles; concrete values passed directly bypass Immer and behave exactly as in core.
- `createAtom().use(immer)` yields an atom type distinct from a plain atom: its `set` accepts a recipe that directly "mutates the draft" (and may return void), and still accepts concrete values.
