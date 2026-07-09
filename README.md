![ZhuàngTài - 状态](./assets/header.png)

[![Core Version](https://img.shields.io/npm/v/@zhuangtai-js/core?label=core&style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/@zhuangtai-js/core)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/%40zhuangtai-js%2Fcore?label=bundle%20size&style=flat&colorA=000000&colorB=000000)](https://bundlephobia.com/package/@zhuangtai-js/core)
[![CI](https://img.shields.io/github/actions/workflow/status/zhuangtai-js/ZhuangTai/ci.yml?branch=main&label=CI&style=flat&colorA=000000&colorB=000000)](https://github.com/zhuangtai-js/ZhuangTai/actions/workflows/ci.yml)
[![License](https://img.shields.io/npm/l/@zhuangtai-js/core?style=flat&colorA=000000&colorB=000000)](./LICENSE)

# ZhuàngTài 状态

简单、直接的 JavaScript 状态原语。

文档站：https://zhuangtai.yojigen.cn · llms.txt：https://zhuangtai.yojigen.cn/llms.txt

ZhuàngTài 是一个轻量的 TypeScript 状态库，核心与框架无关，也不会隐藏调度行为。

## 特性

- 零第三方运行时依赖，核心保持干净。
- 内核极小，见上方 bundle size badge。
- 同步、可预测的语义。
- TypeScript 优先。
- 中英双语文档。
- 支持 llms.txt。

## 何时选择 ZhuàngTài

适合：

- 需要可预测同步语义的小型状态。
- 需要框架无关内核。
- 需要零依赖。
- 需要可组合插件。

不适合：

- 需要内建批处理、异步调度或事务的场景。
- 希望库内部替你隐藏调度细节的场景。

## 包

- `@zhuangtai-js/core`：没有第三方运行时依赖的状态核心。
- `@zhuangtai-js/persist`：用于 `createAtom()` 创建的 atom 的持久化插件。
- `@zhuangtai-js/react`：面向 atom 和 computed 的 React 适配器，提供 hooks。
- `@zhuangtai-js/freeze`：开发期深冻结插件，防止误改状态内部字段。
- `@zhuangtai-js/immer`：Immer 插件，用“修改草稿”的写法完成不可变更新。
- `@zhuangtai-js/sync`：跨上下文同步插件，基于 `BroadcastChannel` 在多个标签页间同步 atom 状态。

## Core API

```ts
import { atom, computed } from "@zhuangtai-js/core";

const count = atom(0);
const double = computed(() => count.get() * 2);

count.get();
count.set(1);
count.set((value) => value + 1);
count.watch((value, prevValue) => {});

double.get();
double.watch((value, prevValue) => {});
```

## API 一览 / API at a glance

| 导出 | TypeScript 形式 | 语义 |
| --- | --- | --- |
| `atom` | `atom(initialValue: RejectFunctionValue<Value>): Atom<Value>` | 创建一个 atom，初始值立即可读可写。 |
| `computed` | `computed(derive: () => Value): Computed<Value>` | 根据同步 derive 自动追踪依赖并派生值。 |
| `createAtom` | `createAtom(): AtomCreator` | 创建可挂载插件的 atom creator。 |
| `.use` | `use(plugin: AtomCreatorPlugin<Name, Options, PluginKind>): AtomCreator<OptionsByPlugin & { readonly [Key in Name]: Options }, PluginKind extends "default" ? Kind : PluginKind>` | 在 creator 上安装插件，并让返回的 creator 接收对应插件选项。 |
| `get()` | `get(): Value` | 读取当前值。 |
| `set()` | `set(nextValue: NextValue<Value>): void` | 写入新值或 updater，立即生效。 |
| `watch()` | `watch(watcher: Watcher<Value>): () => void` | 订阅变化并返回取消订阅函数。 |

`@zhuangtai-js/core` 刻意保持零第三方运行时依赖。框架适配器会放在独立包中。

核心语义：`set` 立即生效，`watch` 回调同步执行，相等性使用 `Object.is`，对象和数组更新按引用比较，watcher 抛错相互隔离。完整语义清单见 [`@zhuangtai-js/core` README](./packages/core/README.md)。

## 持久化

```ts
import { createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";

const atom = createAtom().use(persist);

const theme = atom("light", {
  persist: {
    key: "theme",
  },
});

theme.set("dark");
```

`@zhuangtai-js/persist` 使用同步的 Web Storage 兼容存储。你可以显式传入 `storage` 选项；如果没有传入，它会在可用时回退到 `globalThis.localStorage`。自定义 `storage` 需要实现 `getItem`、`setItem` 和 `removeItem`。更新会先持久化：写入 storage 成功后才提交内存状态并通知 watcher；encode 或写入失败时，内存状态保持不变。默认 JSON codec 支持 JSON 可序列化值；如果需要处理 `undefined`、函数或 symbol 等值，请使用自定义 codec。

## 冻结

```ts
import { createAtom } from "@zhuangtai-js/core";
import { freeze } from "@zhuangtai-js/freeze";

const atom = createAtom().use(freeze);

const user = atom({ name: "阿元" });

user.get().name = "改名"; // 开发期抛错：对象已被冻结
user.set((prev) => ({ ...prev, name: "改名" })); // 正确的不可变更新
```

`@zhuangtai-js/freeze` 在开发期对每个值执行深冻结。core 使用引用相等判断变化，直接改动状态内部会被静默忽略；这个插件让此类误改立即抛错。默认在 `NODE_ENV === "production"` 时降级为无操作，也可用 `enabled` 选项显式开关。

## Immer

```ts
import { createAtom } from "@zhuangtai-js/core";
import { immer } from "@zhuangtai-js/immer";

const atom = createAtom().use(immer);

const todos = atom([{ text: "a", done: false }]);

// 直接“修改草稿”，Immer 会产出新引用后提交。
todos.set((draft) => {
  draft[0].done = true;
  draft.push({ text: "b", done: false });
});
```

`@zhuangtai-js/immer` 把 updater 函数交给 Immer 的 `produce` 执行，让你用直观的“修改草稿”写法完成更新，同时仍产出新引用、保持不可变。直接传入的具体值不经过 Immer，行为与 core 一致。

## 同步

```ts
import { createAtom } from "@zhuangtai-js/core";
import { sync } from "@zhuangtai-js/sync";

const atom = createAtom().use(sync);

const theme = atom("light", {
  sync: {
    key: "theme",
  },
});

theme.set("dark"); // 其他标签页里的同名 atom 也会更新为 "dark"。
```

`@zhuangtai-js/sync` 通过 `BroadcastChannel` 在同源的多个标签页、窗口或 worker 之间同步 atom 状态：本地更新提交后广播，收到远端广播时直接写入底层状态而不再二次广播，从而避免回环。可传入自定义 `channel` 与 `codec`；在 SSR 或不支持 `BroadcastChannel` 的运行时会静默降级为普通 atom，默认 channel 在 Node 中也不会阻止进程退出。

如果这个项目对你有帮助，欢迎在 GitHub 上点一个 ⭐：https://github.com/zhuangtai-js/ZhuangTai

## 许可证

ZhuàngTài 使用 [ISC 许可证](./LICENSE) 发布。你可以自由使用、复制、修改和分发，但需要在副本中保留版权声明和许可证声明。

---

# ZhuàngTài

Simple, direct state primitives for JavaScript.

Docs: https://zhuangtai.yojigen.cn/en/ · llms.txt: https://zhuangtai.yojigen.cn/llms.txt

ZhuàngTài is a tiny TypeScript state library with a framework-agnostic core and no hidden scheduling.

## Highlights

- Zero third-party runtime dependencies in the core.
- Tiny core, see the bundle size badge above.
- Synchronous, predictable semantics.
- TypeScript first.
- Bilingual documentation.
- llms.txt support.

## When to use ZhuàngTài

Best for:

- Small state with predictable synchronous semantics.
- A framework-agnostic core.
- Zero dependencies.
- Composable plugins.

Not for:

- Cases that need built-in batching, async scheduling, or transactions.
- Libraries that should hide scheduling details inside the core.

## Packages

- `@zhuangtai-js/core`: the zero-runtime-dependency state core.
- `@zhuangtai-js/persist`: persistence plugin for atoms created with `createAtom()`.
- `@zhuangtai-js/react`: React adapter with hooks for atoms and computeds.
- `@zhuangtai-js/freeze`: development-time deep-freeze plugin that guards against accidental mutation of state internals.
- `@zhuangtai-js/immer`: Immer plugin for writing immutable updates by "mutating a draft".
- `@zhuangtai-js/sync`: cross-context sync plugin that syncs atom state across tabs through `BroadcastChannel`.

## Core API

```ts
import { atom, computed } from "@zhuangtai-js/core";

const count = atom(0);
const double = computed(() => count.get() * 2);

count.get();
count.set(1);
count.set((value) => value + 1);
count.watch((value, prevValue) => {});

double.get();
double.watch((value, prevValue) => {});
```

## API at a glance / API 一览

| Export | TypeScript shape | Meaning |
| --- | --- | --- |
| `atom` | `atom(initialValue: RejectFunctionValue<Value>): Atom<Value>` | Creates an atom whose initial value is immediately readable and writable. |
| `computed` | `computed(derive: () => Value): Computed<Value>` | Auto-tracks synchronous dependencies and derives a value from them. |
| `createAtom` | `createAtom(): AtomCreator` | Creates an atom creator that can be extended by plugins. |
| `.use` | `use(plugin: AtomCreatorPlugin<Name, Options, PluginKind>): AtomCreator<OptionsByPlugin & { readonly [Key in Name]: Options }, PluginKind extends "default" ? Kind : PluginKind>` | Installs a plugin on the creator and returns a creator that accepts that plugin's per-atom options. |
| `get()` | `get(): Value` | Reads the current value. |
| `set()` | `set(nextValue: NextValue<Value>): void` | Writes a new value or updater and applies it immediately. |
| `watch()` | `watch(watcher: Watcher<Value>): () => void` | Subscribes to changes and returns an unsubscribe function. |

`@zhuangtai-js/core` intentionally has no third-party runtime dependencies. Framework adapters live in separate packages.

Core semantics: `set` applies immediately, `watch` callbacks run synchronously, equality uses `Object.is`, object and array updates are reference-based, and throwing watchers are isolated from each other. See the [`@zhuangtai-js/core` README](./packages/core/README.md) for the full semantics list.

## Persistence

```ts
import { createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";

const atom = createAtom().use(persist);

const theme = atom("light", {
  persist: {
    key: "theme",
  },
});

theme.set("dark");
```

`@zhuangtai-js/persist` uses synchronous Web Storage-compatible storage. Pass a `storage` option explicitly, or it falls back to `globalThis.localStorage` when available. Custom `storage` objects need to implement `getItem`, `setItem`, and `removeItem`. Updates persist first: only after a successful storage write is the in-memory state committed and watchers notified; if encode or the write fails, the in-memory state stays unchanged. Its default JSON codec supports JSON-serializable values; use a custom codec for values such as `undefined`, functions, or symbols.

## Freeze

```ts
import { createAtom } from "@zhuangtai-js/core";
import { freeze } from "@zhuangtai-js/freeze";

const atom = createAtom().use(freeze);

const user = atom({ name: "Yuan" });

user.get().name = "Renamed"; // Throws during development: the object is frozen.
user.set((prev) => ({ ...prev, name: "Renamed" })); // The correct immutable update.
```

`@zhuangtai-js/freeze` deep-freezes every value during development. Core detects changes by reference equality, so mutating state internals in place is silently ignored; this plugin makes such accidental mutations throw immediately. It defaults to a no-op when `NODE_ENV === "production"`, and can be toggled explicitly with the `enabled` option.

## Immer

```ts
import { createAtom } from "@zhuangtai-js/core";
import { immer } from "@zhuangtai-js/immer";

const atom = createAtom().use(immer);

const todos = atom([{ text: "a", done: false }]);

// Directly "mutate the draft"; Immer produces a new reference before committing.
todos.set((draft) => {
  draft[0].done = true;
  draft.push({ text: "b", done: false });
});
```

`@zhuangtai-js/immer` runs updater functions through Immer's `produce`, letting you write updates by directly "mutating a draft" while still producing a new reference and staying immutable. Concrete values passed directly bypass Immer and behave exactly as in core.

## Sync

```ts
import { createAtom } from "@zhuangtai-js/core";
import { sync } from "@zhuangtai-js/sync";

const atom = createAtom().use(sync);

const theme = atom("light", {
  sync: {
    key: "theme",
  },
});

theme.set("dark"); // The same-named atom in other tabs updates to "dark" too.
```

`@zhuangtai-js/sync` synchronizes atom state across same-origin tabs, windows, or workers through `BroadcastChannel`: local updates broadcast after they commit, and incoming broadcasts write straight to the underlying state without re-broadcasting, avoiding echo loops. Pass a custom `channel` and `codec` if needed; under SSR or a runtime without `BroadcastChannel`, it silently degrades to a plain atom, and the default channel never blocks process exit on Node.

If this project helps you, a ⭐ on GitHub is appreciated: https://github.com/zhuangtai-js/ZhuangTai

## License

ZhuàngTài is released under the [ISC License](./LICENSE). You may use, copy, modify, and distribute it freely, provided that the copyright notice and license notice are retained in copies.
