![ZhuàngTài - 状态](./assets/header.png)

[![Core Version](https://img.shields.io/npm/v/@zhuangtai-js/core?label=core&style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/@zhuangtai-js/core)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/%40zhuangtai-js%2Fcore?label=bundle%20size&style=flat&colorA=000000&colorB=000000)](https://bundlephobia.com/package/@zhuangtai-js/core)
[![CI](https://img.shields.io/github/actions/workflow/status/zhuangtai-js/ZhuangTai/ci.yml?branch=main&label=CI&style=flat&colorA=000000&colorB=000000)](https://github.com/zhuangtai-js/ZhuangTai/actions/workflows/ci.yml)
[![License](https://img.shields.io/npm/l/@zhuangtai-js/core?style=flat&colorA=000000&colorB=000000)](./LICENSE)

<p align="center">简体中文 · <a href="./docs/guide/README.en.md">English</a></p>

# ZhuàngTài 状态

简单、直接的 JavaScript 状态原语。

ZhuàngTài 是一个轻量、TypeScript 优先、框架无关的状态库。`set` 立即生效，`watch` 同步执行，相等性使用 `Object.is`，核心没有隐藏调度。

[文档站](https://zhuangtai.yojigen.cn/) · [llms.txt](https://zhuangtai.yojigen.cn/llms.txt)

## 快速开始

```sh
npm install @zhuangtai-js/core
# 或
pnpm add @zhuangtai-js/core
```

```ts
import { atom, computed } from "@zhuangtai-js/core";

const count = atom(0);
const double = computed(() => count.get() * 2);

const stop = count.watch((value, prevValue) => {
  console.log({ value, prevValue });
});

count.set(1);
count.set((value) => value + 1);
double.get(); // 4

stop();
```

`watch` 会在订阅时立即以 `(currentValue, undefined)` 同步调用一次，此后在值实际变化时同步执行。完整边界和错误语义见 [`@zhuangtai-js/core` README](./packages/core/README.md)。

## 核心语义

- `set` 立即生效，不批处理、不延迟。
- `watch` 回调同步执行，并返回取消订阅函数。
- 相等性使用 `Object.is`；相同值不会通知。
- 对象和数组按引用比较；请使用不可变更新。
- 函数不能直接作为 atom 值；如需保存函数，请包在对象中。
- `computed` 同步执行 derive，并自动追踪其中实际读取的依赖。
- core 没有第三方运行时依赖，也不提供隐藏调度、事务或防抖。

## 包

| 包                                                      | 用途                                     | 文档                                                        |
| ------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------- |
| [`@zhuangtai-js/core`](./packages/core/README.md)       | 框架无关的状态核心，零第三方运行时依赖   | [API 参考](https://zhuangtai.yojigen.cn/reference/core/)    |
| [`@zhuangtai-js/react`](./packages/react/README.md)     | React hooks                              | [React 指南](https://zhuangtai.yojigen.cn/guides/react/)    |
| [`@zhuangtai-js/preact`](./packages/preact/README.md)   | Preact hooks                             | [API 参考](https://zhuangtai.yojigen.cn/reference/preact/)  |
| [`@zhuangtai-js/svelte`](./packages/svelte/README.md)   | 标准 Svelte store                        | [API 参考](https://zhuangtai.yojigen.cn/reference/svelte/)  |
| [`@zhuangtai-js/vue`](./packages/vue/README.md)         | 只读 Vue computed ref 与 setter          | [API 参考](https://zhuangtai.yojigen.cn/reference/vue/)     |
| [`@zhuangtai-js/solid`](./packages/solid/README.md)     | Solid accessor 与 setter                 | [API 参考](https://zhuangtai.yojigen.cn/reference/solid/)   |
| [`@zhuangtai-js/persist`](./packages/persist/README.md) | 使用同步 storage 持久化并迁移 atom       | [API 参考](https://zhuangtai.yojigen.cn/reference/persist/) |
| [`@zhuangtai-js/freeze`](./packages/freeze/README.md)   | 开发期深冻结，尽早发现原地修改           | [API 参考](https://zhuangtai.yojigen.cn/reference/freeze/)  |
| [`@zhuangtai-js/immer`](./packages/immer/README.md)     | 使用 Immer 草稿编写不可变更新            | [API 参考](https://zhuangtai.yojigen.cn/reference/immer/)   |
| [`@zhuangtai-js/sync`](./packages/sync/README.md)       | 通过 `BroadcastChannel` 跨同源上下文同步 | [API 参考](https://zhuangtai.yojigen.cn/reference/sync/)    |

插件安装在 `createAtom()` 创建的 creator 上：

```ts
import { createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";

const atom = createAtom().use(persist);
const theme = atom("light", {
  persist: { key: "theme" },
});
```

更多组合方式和顺序语义见[插件与组合](https://zhuangtai.yojigen.cn/guides/plugins/)。

### 当前兼容范围

扩展包只声明已经验证的 peer 版本。当前发布线基于 core 0.5.x；由于 0.x 版本的 minor 更新可能包含破坏性变化，peer 范围不会自动接受未来的 core 0.6.0。

| 包发布线                      | `@zhuangtai-js/core` | 其他 peer                    |
| ----------------------------- | -------------------- | ---------------------------- |
| `@zhuangtai-js/freeze@0.2.x`  | `^0.5.0`             | —                            |
| `@zhuangtai-js/immer@0.2.x`   | `^0.5.0`             | —（Immer 是普通 dependency） |
| `@zhuangtai-js/persist@0.5.x` | `^0.5.0`             | —                            |
| `@zhuangtai-js/preact@0.1.x`  | `^0.5.0`             | Preact `>=10.9 <11`          |
| `@zhuangtai-js/react@0.2.x`   | `^0.5.0`             | React `>=18 <20`             |
| `@zhuangtai-js/solid@0.1.x`   | `^0.5.0`             | Solid `>=1.5 <2`             |
| `@zhuangtai-js/svelte@0.1.x`  | `^0.5.0`             | Svelte `>=4.2 <6`            |
| `@zhuangtai-js/sync@0.2.x`    | `^0.5.0`             | —                            |
| `@zhuangtai-js/vue@0.1.x`     | `^0.5.0`             | Vue `>=3.2 <4`               |

## React

```sh
npm install @zhuangtai-js/core @zhuangtai-js/react react
# 或
pnpm add @zhuangtai-js/core @zhuangtai-js/react react
```

```tsx
import { atom, computed } from "@zhuangtai-js/core";
import { useAtom, useAtomValue } from "@zhuangtai-js/react";

const countAtom = atom(0);
const doubleAtom = computed(() => countAtom.get() * 2);

function Counter() {
  const [count, setCount] = useAtom(countAtom);
  const double = useAtomValue(doubleAtom);

  return (
    <button onClick={() => setCount((value) => value + 1)}>
      {count} × 2 = {double}
    </button>
  );
}
```

`useAtomValue` 也可以读取 `computed`；只需要 setter 时使用 `useSetAtom`，需要绑定式 hook 时使用 `createAtomHook` 或 `createComputedHook`。完整说明见 [`@zhuangtai-js/react` README](./packages/react/README.md)。Preact、Svelte、Vue 与 Solid 的原生 API、生命周期和 SSR 边界见[框架适配器最佳实践](https://zhuangtai.yojigen.cn/guides/framework-adapters/)。

## API 一览

| 导出或方法   | 简化形式                   | 语义                                       |
| ------------ | -------------------------- | ------------------------------------------ |
| `atom`       | `atom(initialValue)`       | 创建可读写 atom。                          |
| `computed`   | `computed(derive)`         | 创建自动追踪依赖的只读派生状态。           |
| `createAtom` | `createAtom()`             | 创建可挂载插件的 atom creator。            |
| `.use`       | `creator.use(plugin)`      | 安装一个具有唯一 ID 的 creator 插件。      |
| `get()`      | `source.get()`             | 同步读取当前值。                           |
| `set()`      | `atom.set(valueOrUpdater)` | 同步提交具体值或 updater。                 |
| `watch()`    | `source.watch(watcher)`    | 立即调用并订阅后续变化，返回取消订阅函数。 |

完整 TypeScript 类型和语义清单以各包 README 与文档站 reference 为准。

## 设计理念

ZhuàngTài 把 API 维持得很小，让每一行状态代码都能直接推演：不需要先理解隐藏队列，也不需要猜测更新何时发生。

复杂性通过独立插件和框架适配器按需组合，核心只保留最直接的状态原语。这样的边界既方便人维护，也让 AI 更容易生成符合真实语义的代码。

适合：

- 需要可预测同步语义的小型或中等状态。
- 需要框架无关、零第三方运行时依赖的核心。
- 希望按需组合持久化、冻结、Immer 或跨上下文同步。

不适合：

- 需要内建批处理、异步调度或事务。
- 希望状态库隐藏更新时机和调度细节。

更多说明见[设计理念](https://zhuangtai.yojigen.cn/philosophy/)。

## 体验、示例与集成

- [在线示例](https://zhuangtai.yojigen.cn/playground/)：直接操作计数器、任务清单与偏好设置，观察真实 React 状态更新。
- [完整示例](https://zhuangtai.yojigen.cn/examples/)：可直接运行和改造的 Vite Vanilla 与 React 工程。
- [为什么是 ZhuàngTài](https://zhuangtai.yojigen.cn/why-zhuangtai/)：直接、同步和类型安全的设计价值。
- [集成与兼容性](https://zhuangtai.yojigen.cn/integrations/)：查看框架、运行时、SSR 与官方适配器的使用方式。
- [Showcase](https://zhuangtai.yojigen.cn/showcase/)：查看使用 ZhuàngTài 构建的项目。

完整工程在 [`examples/`](./examples)。问题和想法请到 [Discussions](https://github.com/zhuangtai-js/ZhuangTai/discussions)，贡献方式见 [`CONTRIBUTING.md`](./CONTRIBUTING.md)。

## AI / Agent 集成

把下面的提示词交给 Claude Code、Codex、Cursor、OpenCode 等编码助手：

```text
请阅读 https://raw.githubusercontent.com/zhuangtai-js/ZhuangTai/main/docs/guide/installation.md 并按其中的步骤在当前项目中安装并配置 ZhuàngTài。
```

也可以安装项目提供的 Agent Skills：

```sh
npx skills add zhuangtai-js/ZhuangTai
```

可用的机器可读文档：

- [llms.txt](https://zhuangtai.yojigen.cn/llms.txt)：文档索引。
- [llms-full.txt](https://zhuangtai.yojigen.cn/llms-full.txt)：完整上下文。
- [llms-small.txt](https://zhuangtai.yojigen.cn/llms-small.txt)：轻量上下文。
- [AI 页面](https://zhuangtai.yojigen.cn/ai/)：集成说明。

如果这个项目对你有帮助，欢迎在 [GitHub](https://github.com/zhuangtai-js/ZhuangTai) 上点一个 Star。

## 许可证

ZhuàngTài 使用 [ISC 许可证](./LICENSE) 发布。你可以自由使用、复制、修改和分发，但需要在副本中保留版权声明和许可证声明。
