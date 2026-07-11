![ZhuàngTài - 状态](./assets/header.png)

[![Core Version](https://img.shields.io/npm/v/@zhuangtai-js/core?label=core&style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/@zhuangtai-js/core)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/%40zhuangtai-js%2Fcore?label=bundle%20size&style=flat&colorA=000000&colorB=000000)](https://bundlephobia.com/package/@zhuangtai-js/core)
[![CI](https://img.shields.io/github/actions/workflow/status/zhuangtai-js/ZhuangTai/ci.yml?branch=main&label=CI&style=flat&colorA=000000&colorB=000000)](https://github.com/zhuangtai-js/ZhuangTai/actions/workflows/ci.yml)
[![License](https://img.shields.io/npm/l/@zhuangtai-js/core?style=flat&colorA=000000&colorB=000000)](./LICENSE)

<p align="center">简体中文 | <a href="./docs/guide/README.en.md">English</a></p>

# ZhuàngTài 状态

简单、直接的 JavaScript 状态原语。

文档站：https://zhuangtai.yojigen.cn · llms.txt：https://zhuangtai.yojigen.cn/llms.txt

ZhuàngTài 是一个轻量的 TypeScript 状态库，核心与框架无关，也不会隐藏调度行为。

## 设计理念

ZhuàngTài 把 API 维持得很小，`atom`、`computed`、`createAtom` 这几件事就够了。每一行代码的行为都尽量能在脑中直接推演，不需要绕一圈才知道会发生什么。

它不做魔法，`set` 立即生效，`watch` 同步执行，判等使用 `Object.is`，对象和数组更新都按引用处理。你只要按不可变的方式更新，就能得到稳定的结果。

核心里不放隐藏调度，不做批处理、防抖或事务。复杂性留给插件和更上层的代码去组织，核心只保留最直接的语义。

内核保持零依赖，`persist`、`freeze`、`immer`、`sync` 都是可选插件。框架适配器也放在独立包里，所以核心可以一直保持干净。

语义越可预测，人和 AI 就越容易写对代码。更多说明见 [设计理念](https://zhuangtai.yojigen.cn/philosophy/)。

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

## 用 AI 一键接入

直接把下面这段提示词贴给 Claude Code、Codex、Cursor、OpenCode 等任意 AI 编码助手：

```text
请阅读 https://raw.githubusercontent.com/zhuangtai-js/ZhuangTai/main/docs/guide/installation.md 并按其中的步骤在当前项目中安装并配置 ZhuàngTài。
```

安装 Agent Skills 时，可以直接运行：

```bash
npx skills add zhuangtai-js/ZhuangTai
```

这会把我们的 Agent Skills 安装到 Claude Code、Codex、OpenCode、Cursor 以及 70+ 个代理中。只装单个 skill 时，可以用：

```bash
npx skills add zhuangtai-js/ZhuangTai --skill zhuangtai
```

## 包

- `@zhuangtai-js/core`：没有第三方运行时依赖的状态核心。
- `@zhuangtai-js/persist`：用于 `createAtom()` 创建的 atom 的持久化插件。
- `@zhuangtai-js/react`：面向 atom 和 computed 的 React 适配器，提供 hooks。
- `@zhuangtai-js/freeze`：开发期深冻结插件，防止误改状态内部字段。
- `@zhuangtai-js/immer`：Immer 插件，用“修改草稿”的写法完成不可变更新。
- `@zhuangtai-js/sync`：跨上下文同步插件，基于 `BroadcastChannel` 在多个标签页间同步 atom 状态。

### 当前兼容范围

扩展包只声明已经验证的 peer 版本。`^0.4.0` 表示支持 core 0.4.x，不会自动接受可能包含破坏性 API 变化的 0.5.0。

| 包发布线 | `@zhuangtai-js/core` | 其他 peer |
| --- | --- | --- |
| `@zhuangtai-js/freeze@0.1.x` | `^0.4.0` | — |
| `@zhuangtai-js/immer@0.1.x` | `^0.4.0` | —（Immer 是普通 dependency） |
| `@zhuangtai-js/persist@0.2.x` | `^0.4.0` | — |
| `@zhuangtai-js/react@0.1.x` | `^0.4.0` | React `>=18 <20` |
| `@zhuangtai-js/sync@0.1.x` | `^0.4.0` | — |

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

## API 一览

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

## AI 友好

- 双语文档站。
- llms.txt 入口：[https://zhuangtai.yojigen.cn/llms.txt](https://zhuangtai.yojigen.cn/llms.txt)，完整上下文：[https://zhuangtai.yojigen.cn/llms-full.txt](https://zhuangtai.yojigen.cn/llms-full.txt)，轻量上下文：[https://zhuangtai.yojigen.cn/llms-small.txt](https://zhuangtai.yojigen.cn/llms-small.txt)。
- `skills/` 目录里提供 Agent Skills，可以通过 `npx skills` 安装。
- MCP server：规划中。

更多说明见 [AI 页面](https://zhuangtai.yojigen.cn/ai/)。

## 许可证

ZhuàngTài 使用 [ISC 许可证](./LICENSE) 发布。你可以自由使用、复制、修改和分发，但需要在副本中保留版权声明和许可证声明。
